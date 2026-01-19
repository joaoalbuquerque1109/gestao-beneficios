/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getActiveEmployees() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('employees')
    .select('id, name')
    .neq('status', 'INATIVO')
    .order('name')

  if (error) {
    console.error('Erro ao buscar funcionários:', error)
    return []
  }
  return data
}

export async function saveAbsence(data: {
  employeeId: string
  date: string
  reason: string
  type: string
}) {
  const supabase = await createClient()

  if (!data.employeeId || !data.date) {
    return { error: 'Matrícula e Data são obrigatórias.' }
  }

  // --- CORREÇÃO DE SEGURANÇA ---
  // Forçamos o type para UpperCase para garantir que o cálculo encontre (INJUSTIFICADA vs Injustificada)
  const safeType = data.type ? data.type.toUpperCase() : 'INJUSTIFICADA';

  const record = {
    employee_id: data.employeeId,
    date: data.date,
    reason: data.reason || 'Falta Manual',
    type: safeType // Usa o valor tratado
  }

  const { error } = await supabase
    .from('absences')
    .insert(record)
  
  if (error) {
    if (error.code === '23505') {
       return { error: 'Já existe uma falta registrada para este funcionário nesta data.' }
    }
    return { error: 'Erro ao salvar falta.' }
  }

  revalidatePath('/absences')
  return { success: true }
}

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

  const { error } = await supabase
    .from('absences')
    .insert(records)
    .select('*')

  if (error) {
    if (error.code === '23505') {
       return { error: 'Algumas faltas já estavam cadastradas (duplicadas). Importação parcial realizada.' }
    }
    console.error('Erro ao salvar faltas:', error)
    return { error: 'Erro ao salvar dados.' }
  }

  revalidatePath('/absences')
  return { success: true, count: records.length } 
}

export async function deleteAbsence(id: string) {
  const supabase = await createClient()
  await supabase.from('absences').delete().eq('id', id)
  revalidatePath('/absences')
}