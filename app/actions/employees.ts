'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

interface EmployeeFormData {
  id: string;
  name: string;
  cpf: string;
  role: string;
  department: string;
  location: string;
  salary: number;
  admissionDate: string;
  birthDate: string;
  status: string;
}

export async function createEmployee(formData: EmployeeFormData, userName: string) {
  const supabase = await createClient()

  // 1. Inserir Funcionário
  const { error } = await supabase.from('employees').insert([{
    id: formData.id,
    name: formData.name,
    cpf: formData.cpf,
    role: formData.role,
    department_id: formData.department,
    location_id: formData.location,
    salary: formData.salary,
    admission_date: formData.admissionDate,
    birth_date: formData.birthDate,
    status: formData.status
  }])

  if (error) return { error: error.message }

  // 2. Registrar Movimentação (ADMISSÃO)
  const currentMonth = new Date().toISOString().slice(0, 7)
  await supabase.from('movements').insert([{
    employee_id: formData.id,
    employee_name: formData.name,
    type: 'ADMISSAO',
    new_value: 'NOVO FUNCIONÁRIO',
    user_name: userName,
    reference_month: currentMonth
  }])

  revalidatePath('/employees') // Atualiza a lista na hora
  return { success: true }
}

export async function deleteEmployee(id: string, name: string, userName: string) {
  const supabase = await createClient()

  // 1. Registrar Movimentação (EXCLUSÃO) antes de apagar (ou soft delete)
  const currentMonth = new Date().toISOString().slice(0, 7)
  await supabase.from('movements').insert([{
    employee_id: id,
    employee_name: name,
    type: 'EXCLUSAO',
    old_value: 'REGISTRO ATIVO',
    new_value: 'REMOVIDO',
    user_name: userName,
    reference_month: currentMonth
  }])

  // 2. Apagar Funcionário
  const { error } = await supabase.from('employees').delete().eq('id', id)
  
  if (error) return { error: error.message }

  revalidatePath('/employees')
  return { success: true }
}