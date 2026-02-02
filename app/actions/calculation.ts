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

  // 1. Resolver Período (Busca por ID ou Nome, ou cria se não existir)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(periodInput)
  if (!isUUID) {
    const { data: existingPeriod } = await supabase.from('periods').select('id, name').eq('name', periodInput).single()
    if (existingPeriod) {
      targetId = existingPeriod.id
      periodName = existingPeriod.name
    } else {
      const { data: newPeriod, error: createError } = await supabase.from('periods')
        .insert({ name: periodInput, status: 'OPEN', total_employees: 0, total_value: 0 })
        .select('id, name').single()
      if (createError) return { error: 'Erro ao criar período: ' + createError.message }
      targetId = newPeriod.id
      periodName = newPeriod.name
    }
  } else {
    const { data: p } = await supabase.from('periods').select('name').eq('id', targetId).single()
    if (p) periodName = p.name
  }

  // 2. Configurações Globais
  const { data: config, error: configError } = await supabase.from('global_config').select('*').single()
  if (configError || !config) return { error: 'Erro crítico: Configurações globais não encontradas.' }

  const DAILY_VALUE_VA = Number(config.daily_value_va)
  const BASKET_VALUE = Number(config.basket_value)
  const BASKET_LIMIT = Number(config.basket_limit)
  const STANDARD_BUSINESS_DAYS = Number(config.business_days)

  // Definição das datas de corte (Janela Fiscal, ex: 15/12 a 15/01)
  const { start: absencesStart, end: absencesEnd } = getCalculationRange(periodName, config.cutoff_day)

  // 3. Buscar Dados
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('*')
    .in('status', ['ATIVO', 'AFASTADO', 'FERIAS', 'LICENCA', 'ATESTADO']) 
  
  if (empError) return { error: 'Erro ao buscar funcionários: ' + empError.message }

  // 3.1 Buscar Regras de Status
  const { data: statusRulesData, error: statusError } = await supabase
    .from('employee_statuses')
    .select('name, includes_va_calculation, includes_basket_calculation, exclusion_type, exclusion_percentage')
  
  // Criar mapa de status para regras
  const statusRulesMap = new Map()
  if (statusRulesData) {
    statusRulesData.forEach(rule => {
      statusRulesMap.set(rule.name, {
        includes_va_calculation: rule.includes_va_calculation,
        includes_basket_calculation: rule.includes_basket_calculation,
        exclusion_type: rule.exclusion_type,
        exclusion_percentage: rule.exclusion_percentage
      })
    })
  }

  const { data: absences, error: absError } = await supabase
    .from('absences').select('*').gte('date', absencesStart).lte('date', absencesEnd)
  if (absError) return { error: 'Erro ao buscar ausências: ' + absError.message }

  const { data: adjustments, error: adjError } = await supabase
    .from('adjustments').select('*').eq('period_id', periodName)
  if (adjError) return { error: 'Erro ao buscar ajustes: ' + adjError.message }

  // 4. Calcular Benefícios Individualmente
  const resultsToInsert = employees.map(employee => {
    // A. Processamento de Ausências
    const empAbsences = absences?.filter(a => a.employee_id === employee.id) || []
    const manualUnjustified = empAbsences.filter(a => a.type === 'INJUSTIFICADA').length
    const manualJustified = empAbsences.filter(a => a.type === 'JUSTIFICADA').length

    // B. Cálculo de Dias de Férias/Afastamento (Corrigido para usar a Janela de Corte)
    let vacationDays = 0
    if (employee.status_start_date && employee.status_end_date) {
        const statusStart = new Date(employee.status_start_date)
        const statusEnd = new Date(employee.status_end_date)
        
        // CORREÇÃO: Usamos a janela de corte (ex: 15/12 a 15/01) como limites
        const windowStart = new Date(absencesStart)
        const windowEnd = new Date(absencesEnd)
        
        // Verifica intersecção com a janela fiscal atual
        const interStart = statusStart > windowStart ? statusStart : windowStart
        const interEnd = statusEnd < windowEnd ? statusEnd : windowEnd
        
        // Se houver sobreposição válida (Start <= End), calculamos os dias úteis dessa sobreposição
        if (interStart <= interEnd) {
            vacationDays = getBusinessDaysBetween(interStart, interEnd)
        }
    }

    // C. Soma de Ajustes Financeiros Manuais
    const empAdjustments = adjustments?.filter(a => a.employee_id === employee.id) || []
    const adjustmentsTotal = empAdjustments.reduce((acc, curr) => {
        const val = Number(curr.value)
        return curr.type === 'CREDITO' ? acc + val : acc - val
    }, 0)

    // D. Chamada da Regra de Negócio
    const statusRules = statusRulesMap.get(employee.status)
    const calculation = calculateBenefit({
      employee,
      unjustifiedAbsences: manualUnjustified,
      justifiedAbsences: manualJustified, 
      vacationDays: vacationDays,         // Agora contém apenas dias dentro da janela (15 a 15)
      workingDays: STANDARD_BUSINESS_DAYS,
      dailyValueVA: DAILY_VALUE_VA,
      basketValue: BASKET_VALUE,
      basketLimit: BASKET_LIMIT,
      periodId: periodName,
      adjustmentsTotal: adjustmentsTotal,
      statusRules: statusRules  // NOVO: Passar as regras do status
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
      total_receivable: calculation.total,
      calculation_details: { 
          ...calculation.debug, 
          vacationDaysCalculated: vacationDays,
          vacationRangeUsed: { start: absencesStart, end: absencesEnd }, // Atualizado para refletir a janela usada
          adjustmentsTotal 
      }
    }
  })

  // 5. Salvar Resultados no Banco
  await supabase.from('period_results').delete().eq('period_id', targetId)
  
  if (resultsToInsert.length > 0) {
    const { error: insertError } = await supabase.from('period_results').insert(resultsToInsert)
    if (insertError) return { error: 'Erro ao salvar resultados: ' + insertError.message }
  }

  const totalValue = resultsToInsert.reduce((acc, curr) => acc + curr.total_receivable, 0)
  
  // Atualiza status do período
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

// --- FUNÇÕES AUXILIARES DE LEITURA (Mantidas iguais) ---

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

export async function getCalculationDetails(periodName: string) {
  const supabase = await createClient()

  const { data: config } = await supabase
    .from('global_config')
    .select('cutoff_day, basket_limit')
    .single()
  
  const cutoffDay = config?.cutoff_day
  const basketLimit = Number(config?.basket_limit)

  const [year, month] = periodName.split('-').map(Number)
  const endDate = new Date(year, month - 1, cutoffDay)
  const startDate = new Date(year, month - 2, cutoffDay)

  const { data: results, error } = await supabase
    .from('period_results')
    .select(`
      id,
      employee_id,
      employee_name,
      employee_role,
      department,
      days_worked,
      va_value,
      basket_value,
      total_receivable,
      calculation_details,
      employees!inner ( salary ),
      periods!inner ( name ) 
    `)
    .eq('periods.name', periodName)
    .order('employee_name')

  if (error) {
    console.error('Erro ao buscar detalhes:', error)
    return { error: 'Erro ao buscar dados.' }
  }

  return { 
    results,
    basketLimit,
    window: { 
      start: startDate.toLocaleDateString('pt-BR'), 
      end: endDate.toLocaleDateString('pt-BR') 
    } 
  }
}