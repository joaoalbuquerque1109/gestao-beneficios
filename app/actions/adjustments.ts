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

export async function deleteAdjustment(id: string) {
  const supabase = await createClient()
  await supabase.from('adjustments').delete().eq('id', id)
  revalidatePath('/adjustments')
}