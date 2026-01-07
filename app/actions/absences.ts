/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveAbsencesBatch(absences: any[]) {
  const supabase = await createClient()

  // Mapeia para o formato do banco (snake_case)
  const records = absences.map(a => ({
    employee_id: a.employeeId,
    date: a.date,
    reason: a.reason
  }))

  const { error } = await supabase.from('absences').insert(records)

  if (error) {
    console.error('Erro ao salvar faltas:', error)
    return { error: 'Erro ao salvar no banco de dados. Verifique se as matrículas existem.' }
  }

  revalidatePath('/absences')
  return { success: true, count: records.length }
}

export async function deleteAbsence(id: string) {
  const supabase = await createClient()
  await supabase.from('absences').delete().eq('id', id)
  revalidatePath('/absences')
}