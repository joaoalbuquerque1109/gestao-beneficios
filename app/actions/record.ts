'use server'

import { createClient } from '@/utils/supabase/server'

export async function getEmployeeRecordData(employeeId: string) {
  const supabase = await createClient()

  // 1. Buscar dados frescos do Funcionário (garantir que temos tudo para edição)
  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('id', employeeId)
    .single()

  // 2. Buscar Movimentações
  const { data: movements } = await supabase
    .from('movements')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })

  // 3. Buscar Faltas
  const { data: absences } = await supabase
    .from('absences')
    .select('*')
    .eq('employee_id', employeeId)
    .order('date', { ascending: false })

  return {
    employee: employee || null,
    movements: movements || [],
    absences: absences || []
  }
}