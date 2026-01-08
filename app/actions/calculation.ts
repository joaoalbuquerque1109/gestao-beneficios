'use server'

import { createClient } from '@/utils/supabase/server'
import { getCalculationRange, getBusinessDaysInMonth } from '@/utils/date-helpers'
import { calculateBenefit } from '@/services/benefit-calculation'
import { revalidatePath } from 'next/cache'

export async function processPeriod(periodId: string, userEmail: string) {
  const supabase = await createClient()

  // 1. BUSCAR CONFIGURAÇÕES GLOBAIS (Dinâmico)
  // Se não tiver nada no banco, usa os valores padrão (fallback)
  const { data: configData } = await supabase
    .from('global_config')
    .select('*')
    .single()

  const config = {
    dailyValueVA: Number(configData?.daily_value_va) || 15.00,
    basketValue: Number(configData?.basket_value) || 142.05,
    basketLimit: Number(configData?.basket_limit) || 1780.00,
    cutoffDay: Number(configData?.cutoff_day) || 15
  }

  // 2. Definir Janela de Datas com base na configuração
  const [year, month] = periodId.split('-').map(Number)
  const range = getCalculationRange(periodId, config.cutoffDay)
  
  // 3. BUSCAR DADOS
  // A. Funcionários Ativos
  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .eq('status', 'ATIVO')

  if (!employees?.length) return { error: 'Nenhum funcionário ativo encontrado.' }

  // B. Faltas na Janela de Apuração
  const { data: absences } = await supabase
    .from('absences')
    .select('employee_id')
    .gte('date', range.start)
    .lte('date', range.end)

  // C. Ajustes Manuais (Créditos/Débitos) desta competência
  const { data: adjustments } = await supabase
    .from('adjustments')
    .select('*')
    .eq('period_id', periodId)

  // 4. Preparar/Atualizar o Período (Status: PROCESSADO)
  const standardWorkDays = getBusinessDaysInMonth(year, month - 1)
  
  const { error: periodError } = await supabase
    .from('periods')
    .upsert({ 
        id: periodId, 
        working_days: standardWorkDays,
        status: 'PROCESSADO',
        processed_by: userEmail,
        processed_at: new Date().toISOString()
    })
  
  if (periodError) return { error: 'Erro ao criar período: ' + periodError.message }

  // 5. EXECUTAR O CÁLCULO
  let grandTotal = 0
  
  const results = employees.map(emp => {
    // a) Contagem de Faltas
    const empAbsences = absences?.filter(a => a.employee_id === emp.id).length || 0
    
    // b) Soma de Ajustes
    const empAdjustments = adjustments?.filter(a => a.employee_id === emp.id) || []
    let adjustmentsTotal = 0
    
    empAdjustments.forEach(adj => {
        if (adj.type === 'CREDITO') adjustmentsTotal += Number(adj.value)
        if (adj.type === 'DEBITO') adjustmentsTotal -= Number(adj.value)
    })

    // c) Regra de Negócio (VA e Cesta)
    // Passamos as configurações dinâmicas aqui
    const calc = calculateBenefit({
        employee: emp,
        absencesCount: empAbsences,
        workingDays: standardWorkDays,
        dailyValueVA: config.dailyValueVA,
        basketValue: config.basketValue,
        basketLimit: config.basketLimit,
        periodId
    })

    // d) Totalização (Benefícios + Ajustes)
    // Math.max(0, ...) impede valor negativo a pagar
    const finalPayable = Math.max(0, calc.total + adjustmentsTotal)

    grandTotal += finalPayable

    return {
        period_id: periodId,
        employee_id: emp.id,
        employee_name: emp.name,
        employee_role: emp.role,
        department: emp.department_id,
        
        days_worked: calc.daysWorked,
        absences_count: empAbsences,
        
        va_value: calc.vaValue,
        basket_value: calc.basketValue,
        adjustments_value: adjustmentsTotal, // Valor líquido dos ajustes
        
        total_payable: finalPayable
    }
  })

  // 6. SALVAR RESULTADOS
  // Remove cálculo anterior desse mês para evitar duplicidade
  await supabase.from('period_results').delete().eq('period_id', periodId)
  
  const { error: resultError } = await supabase
    .from('period_results')
    .insert(results)

  if (resultError) return { error: 'Erro ao salvar resultados: ' + resultError.message }

  // 7. Atualizar Totais no Período
  await supabase
    .from('periods')
    .update({ 
        total_employees: results.length,
        total_value: grandTotal
    })
    .eq('id', periodId)

  revalidatePath('/calculation')
  return { success: true, total: grandTotal, count: results.length }
}