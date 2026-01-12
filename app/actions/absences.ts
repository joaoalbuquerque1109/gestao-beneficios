/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveAbsencesBatch(absences: any[]) {
  const supabase = await createClient()

  // Mapeia os dados recebidos para o formato do banco
  const records = absences.map(a => ({
    employee_id: a.employeeId,
    date: a.date,
    reason: a.reason || 'Falta Registrada',
    // LÓGICA DO TIPO:
    // Se vier especificado "INJUSTIFICADA" ou "FALTA", marca como INJUSTIFICADA.
    // Caso contrário (ex: "Atestado", "Médico", ou vazio), assume JUSTIFICADA.
    type: (a.type && ['INJUSTIFICADA', 'FALTA', 'SUSPENSAO'].includes(a.type.toUpperCase())) 
          ? 'INJUSTIFICADA' 
          : 'JUSTIFICADA'
  }))

  const { error } = await supabase.from('absences').insert(records)

  if (error) {
    console.error('Erro ao salvar faltas:', error)
    return { error: 'Erro ao salvar dados. Verifique se as matrículas estão corretas.' }
  }

  revalidatePath('/absences')
  return { success: true, count: records.length }
}

export async function deleteAbsence(id: string) {
  const supabase = await createClient()
  await supabase.from('absences').delete().eq('id', id)
  revalidatePath('/absences')
}