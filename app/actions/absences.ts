/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveAbsencesBatch(absences: any[]) {
  const supabase = await createClient()

  const records = absences.map(a => ({
    employee_id: a.employeeId,
    date: a.date,
    reason: a.reason || 'Falta Registrada',
    type: (a.type && ['INJUSTIFICADA', 'FALTA', 'SUSPENSAO'].includes(a.type.toUpperCase())) 
          ? 'INJUSTIFICADA' 
          : 'JUSTIFICADA'
  }))

  // Use ignoreDuplicates: true para ignorar erros se a falta já existir naquele dia
  const { error } = await supabase
    .from('absences')
    .insert(records)
    .select('*') // Para retornar a contagem correta

  if (error) {
    // Código 23505 é violação de chave única (Unique Violation) no Postgres
    if (error.code === '23505') {
       return { error: 'Algumas faltas já estavam cadastradas. As novas foram ignoradas.' }
    }
    console.error('Erro ao salvar faltas:', error)
    return { error: 'Erro ao salvar dados. Verifique matrículas e datas.' }
  }

  revalidatePath('/absences')
  // Se usar select() no insert, o count vem na resposta
  return { success: true, count: records.length } 
}

export async function deleteAbsence(id: string) {
  const supabase = await createClient()
  await supabase.from('absences').delete().eq('id', id)
  revalidatePath('/absences')
}