'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { calculateBenefit } from '@/services/benefit-calculation'
import { getCalculationRange, getBusinessDaysBetween } from '@/utils/date-helpers'

// --- FUNÇÃO DE PROCESSAMENTO ---
export async function processPeriod(periodInput: string, userEmail: string) {
  const supabase = await createClient()
  let targetId = periodInput
  let periodName = periodInput

  // 1. Resolver Período
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(periodInput)
  if (!isUUID) {
    const { data: existingPeriod } = await supabase.from('periods').select('id, name').eq('name', periodInput).single()
    if (existingPeriod) {
      targetId = existingPeriod.id
      periodName = existingPeriod.name
    } else {
      const { data: newPeriod, error: createError } = await supabase.from('periods')
        .insert({ name: periodInput, status: 'RASCUNHO', total_employees: 0, total_value: 0 })
        .select('id, name').single()
      if (createError) return { error: 'Erro ao criar período: ' + createError.message }
      targetId = newPeriod.id
      periodName = newPeriod.name
    }
  } else {
    const { data: p } = await supabase.from('periods').select('name').eq('id', targetId).single()
    if (p) periodName = p.name
  }

  // 2. Configurações
  const { data: config, error: configError } = await supabase.from('global_config').select('*').single()
  if (configError || !config) return { error: 'Erro crítico: Configurações globais não encontradas.' }

  const DAILY_VALUE_VA = Number(config.daily_value_va) || 15.00
  const BASKET_VALUE = Number(config.basket_value) || 142.05
  const BASKET_LIMIT = Number(config.basket_limit) || 1780.00
  const STANDARD_BUSINESS_DAYS = Number(config.business_days) || 22

  // Intervalos
  const { start: absencesStart, end: absencesEnd } = getCalculationRange(periodName, config.cutoff_day || 15)
  const [pYear, pMonth] = periodName.split('-').map(Number)
  const monthStart = new Date(pYear, pMonth - 1, 1)
  const monthEnd = new Date(pYear, pMonth, 0)

  // 3. Buscar Dados (Funcionários, Ausências e Ajustes)
  const { data: employees, error: empError } = await supabase
    .from('employees').select('*').not('status', 'eq', 'INATIVO')
  if (empError) return { error: 'Erro ao buscar funcionários: ' + empError.message }

  const { data: absences, error: absError } = await supabase
    .from('absences').select('*').gte('date', absencesStart).lte('date', absencesEnd)
  if (absError) return { error: 'Erro ao buscar ausências: ' + absError.message }

  // --- NOVO: BUSCAR AJUSTES FINANCEIROS ---
  // Busca todos os ajustes vinculados a este período (nome do período, ex: "2024-05")
  const { data: adjustments, error: adjError } = await supabase
    .from('adjustments')
    .select('*')
    .eq('period_id', periodName)
  
  if (adjError) return { error: 'Erro ao buscar ajustes: ' + adjError.message }
  // ----------------------------------------

  // 4. Calcular
  const resultsToInsert = employees.map(employee => {
    // Processamento de Ausências
    const empAbsences = absences?.filter(a => a.employee_id === employee.id) || []
    const manualUnjustified = empAbsences.filter(a => a.type === 'INJUSTIFICADA').length
    const manualJustified = empAbsences.filter(a => a.type === 'JUSTIFICADA').length

    let vacationDays = 0
    if (employee.status_start_date && employee.status_end_date) {
        const statusStart = new Date(employee.status_start_date)
        const statusEnd = new Date(employee.status_end_date)
        const interStart = statusStart > monthStart ? statusStart : monthStart
        const interEnd = statusEnd < monthEnd ? statusEnd : monthEnd
        if (interStart <= interEnd) {
            vacationDays = getBusinessDaysBetween(interStart, interEnd)
        }
    }
    const totalJustified = manualJustified + vacationDays

    // --- NOVO: CALCULAR TOTAL DE AJUSTES ---
    const empAdjustments = adjustments?.filter(a => a.employee_id === employee.id) || []
    
    const adjustmentsTotal = empAdjustments.reduce((acc, curr) => {
        const val = Number(curr.value)
        return curr.type === 'CREDITO' ? acc + val : acc - val
    }, 0)
    // --------------------------------------

    const calculation = calculateBenefit({
      employee,
      unjustifiedAbsences: manualUnjustified,
      justifiedAbsences: totalJustified,
      workingDays: STANDARD_BUSINESS_DAYS,
      dailyValueVA: DAILY_VALUE_VA,
      basketValue: BASKET_VALUE,
      basketLimit: BASKET_LIMIT,
      periodId: periodName,
      adjustmentsTotal: adjustmentsTotal // <--- Passando o valor para o cálculo
    })

    return {
      period_id: targetId,
      employee_id: employee.id,
      employee_name: employee.name,
      employee_role: employee.role,
      department: employee.department_id,
      days_worked: calculation.daysWorked,
      va_value: calculation.vaValue,
      basket_value: calculation.basketValue,
      total_receivable: calculation.total, // Total agora já inclui os ajustes
      calculation_details: { 
          ...calculation.debug, 
          vacationDaysCalculated: vacationDays,
          vacationRangeUsed: { start: monthStart, end: monthEnd },
          adjustmentsTotal // Salva o detalhe do ajuste para conferência
      }
    }
  })

  // 5. Salvar
  await supabase.from('period_results').delete().eq('period_id', targetId)
  if (resultsToInsert.length > 0) {
    const { error: insertError } = await supabase.from('period_results').insert(resultsToInsert)
    if (insertError) return { error: 'Erro ao salvar resultados: ' + insertError.message }
  }

  const totalValue = resultsToInsert.reduce((acc, curr) => acc + curr.total_receivable, 0)
  await supabase.from('periods').update({ 
        status: 'PROCESSADO',
        total_employees: resultsToInsert.length,
        total_value: totalValue,
        processed_by: userEmail,
        processed_at: new Date().toISOString()
    }).eq('id', targetId)

  revalidatePath('/calculation')
  return { success: true, count: resultsToInsert.length, total: totalValue }
}

// --- FUNÇÃO PARA EXPORTAÇÃO (MANTIDA IGUAL, MAS INCLUÍDA POR INTEGRIDADE) ---
export async function getPeriodDataForExport(periodName: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('period_results')
    .select(`
      employee_id,
      employee_name,
      total_receivable,
      employees!inner (
        cpf,
        birth_date,
        department_id
      ),
      periods!inner (
        name
      )
    `)
    .eq('periods.name', periodName)

  if (error) {
    console.error('Erro na exportação:', error)
    return { error: error.message }
  }
  
  return { data }
}