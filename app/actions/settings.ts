/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type UpdateSettingsData = {
  dailyValueVA: number
  basketValue: number
  basketLimit: number
  cutoffDay: number
}

// --- 1. Configuração Global ---
export async function updateGlobalSettings(data: UpdateSettingsData, userName: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('global_config').update({
      daily_value_va: data.dailyValueVA,
      basket_value: data.basketValue,
      basket_limit: data.basketLimit,
      cutoff_day: data.cutoffDay,
      updated_by: userName,
      updated_at: new Date().toISOString()
    }).eq('id', 1)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  revalidatePath('/calculation')
  return { success: true }
}

// --- 2. Listas Auxiliares (Genérico) ---
export async function manageListItem(table: 'departments' | 'locations' | 'employee_statuses', action: 'ADD' | 'DELETE' | 'TOGGLE', data: any) {
  const supabase = await createClient()
  let error = null

  if (action === 'ADD') {
    // Normaliza ID: Remove espaços e acentos, Uppercase
    const id = data.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, '_')
    const { error: err } = await supabase.from(table).insert([{ id, name: data.name.toUpperCase(), status: 'ATIVO' }])
    error = err
  } 
  else if (action === 'DELETE') {
    const { error: err } = await supabase.from(table).delete().eq('id', data.id)
    error = err
  }
  else if (action === 'TOGGLE') {
    // Inverte status ATIVO <-> INATIVO
    const newStatus = data.currentStatus === 'ATIVO' ? 'INATIVO' : 'ATIVO'
    const { error: err } = await supabase.from(table).update({ status: newStatus }).eq('id', data.id)
    error = err
  }

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

// --- 3. Períodos ---
export async function togglePeriodStatus(periodId: string, currentStatus: boolean) {
  const supabase = await createClient()
  // Se está aberto (true), fecha (false). Se fechado, abre.
  // Nota: No banco 'is_open' controla se aceita novos cálculos
  const { error } = await supabase.from('periods').update({ is_open: !currentStatus }).eq('id', periodId)
  
  if (error) return { error: error.message }
  revalidatePath('/settings')
  revalidatePath('/calculation')
  return { success: true }
}

// --- 4. Ações de Reset (PERIGO) ---
export async function resetSystem(target: 'EMPLOYEES' | 'ABSENCES' | 'CALCULATION', userName: string) {
  const supabase = await createClient()
  
  // Log de segurança antes de apagar
  await supabase.from('movements').insert([{
    employee_id: 'SYSTEM', employee_name: 'SYSTEM', type: 'EXCLUSAO',
    old_value: `RESET TOTAL: ${target}`, user_name: userName, reference_month: new Date().toISOString().slice(0,7)
  }])

  let error = null

  if (target === 'EMPLOYEES') {
    // Apaga funcionários (Cascade apaga movimentações, faltas, ajustes)
    // Mantém: Períodos e Configurações
    const { error: err } = await supabase.from('employees').delete().neq('id', '000000') // Apaga tudo
    error = err
  } 
  else if (target === 'ABSENCES') {
    const { error: err } = await supabase.from('absences').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    error = err
  }
  else if (target === 'CALCULATION') {
    // Apaga resultados de cálculos que NÃO foram exportados/auditados
    // Precisamos filtrar períodos abertos/processados apenas
    const { data: openPeriods } = await supabase.from('periods').select('id').neq('status', 'EXPORTADO')
    const ids = openPeriods?.map(p => p.id) || []
    
    if (ids.length > 0) {
        const { error: err } = await supabase.from('period_results').delete().in('period_id', ids)
        // Reseta status dos períodos para RASCUNHO
        await supabase.from('periods').update({ 
            status: 'RASCUNHO', total_employees: 0, total_value: 0 
        }).in('id', ids)
        error = err
    }
  }

  if (error) return { error: error.message }
  
  revalidatePath('/')
  return { success: true }
}