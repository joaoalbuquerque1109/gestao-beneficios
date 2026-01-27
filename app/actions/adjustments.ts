/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createAdjustment(data: any) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('adjustments').insert([{
    employee_id: data.employeeId,
    period_id: data.periodId,
    type: data.type,
    value: data.value,
    reason: data.reason
  }])

  if (error) return { error: error.message }
  
  revalidatePath('/adjustments')
  return { success: true }
}

export async function updateAdjustment(id: string, data: any) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('adjustments').update({
    employee_id: data.employeeId,
    type: data.type,
    value: data.value,
    reason: data.reason,
    period_id: data.periodId 
  }).eq('id', id)

  if (error) return { error: error.message }
  
  revalidatePath('/adjustments')
  return { success: true }
}

export async function deleteAdjustment(id: string) {
  const supabase = await createClient()
  await supabase.from('adjustments').delete().eq('id', id)
  revalidatePath('/adjustments')
}

export async function importAdjustmentsBatch(adjustments: any[]) {
  const supabase = await createClient()
  
  // Prepara os dados para inserção (mapeia chaves se necessário)
  const records = adjustments.map(item => ({
    employee_id: item.employee_id,
    period_id: item.period_id,
    type: item.type,
    value: item.value,
    reason: item.reason
  }))

  const { error } = await supabase.from('adjustments').insert(records)
  
  if (error) {
    return { error: `Erro ao importar: ${error.message}` }
  }

  revalidatePath('/adjustments')
  return { success: true, count: records.length }
}