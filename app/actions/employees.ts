/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// --- CRIAR OU ATUALIZAR (UPSERT) ---
export async function saveEmployee(data: any, user: string, isEdit: boolean) {
  const supabase = await createClient()
  const currentMonth = new Date().toISOString().slice(0, 7)

  const cpfClean = String(data.cpf || '').replace(/\D/g, '')

  // Prepara o objeto para salvar
  const employeeData = {
    id: data.id,
    name: data.name.toUpperCase(),
    cpf: cpfClean,
    role: data.role.toUpperCase(),
    department_id: data.department,
    location_id: data.location,
    salary: parseFloat(data.salary),
    admission_date: data.admissionDate,
    birth_date: data.birthDate,
    status: data.status
  }

  if (isEdit) {
    // --- EDIÇÃO ---
    // Busca dados antigos para registrar o que mudou no log
    const { data: oldEmp } = await supabase.from('employees').select('*').eq('id', data.id).single()
    
    const { error } = await supabase.from('employees').update(employeeData).eq('id', data.id)
    
    if (error) return { error: error.message }

    // Log de alteração
    await supabase.from('movements').insert([{
      employee_id: data.id,
      employee_name: data.name,
      type: 'EDICAO_DADOS',
      old_value: oldEmp ? `Salário: ${oldEmp.salary}` : 'Dados Antigos',
      new_value: `Salário: ${data.salary}`,
      user_name: user,
      reference_month: currentMonth
    }])

  } else {
    // --- CRIAÇÃO ---
    const { error } = await supabase.from('employees').insert([employeeData])
    
    if (error) return { error: error.message }

    // Log de admissão
    await supabase.from('movements').insert([{
      employee_id: data.id,
      employee_name: data.name,
      type: 'ADMISSAO',
      new_value: 'NOVO FUNCIONÁRIO',
      user_name: user,
      reference_month: currentMonth
    }])
  }

  revalidatePath('/employees')
  return { success: true }
}

// --- IMPORTAÇÃO EM MASSA (EXCEL) ---
export async function importEmployeesBatch(employees: any[], user: string) {
  const supabase = await createClient()
  
  const records = employees.map(e => ({
    id: e.id,
    name: e.name.toUpperCase(),
    cpf: String(e.cpf || '').replace(/\D/g, ''),
    role: e.role.toUpperCase(),
    department_id: e.department,
    location_id: e.location,
    salary: e.salary,
    admission_date: e.admissionDate,
    birth_date: e.birthDate,
    status: e.status
  }))

  const { error } = await supabase.from('employees').upsert(records)
  
  if (error) return { error: error.message }

  revalidatePath('/employees')
  return { success: true, count: records.length }
}

// --- EXCLUSÃO (COM LIMPEZA) ---
export async function deleteEmployee(id: string, name: string, userName: string) {
  const supabase = await createClient()
  const currentMonth = new Date().toISOString().slice(0, 7)

  // 1. Registrar LOG de exclusão antes de apagar
  await supabase.from('movements').insert([{
    employee_id: id,
    employee_name: name,
    type: 'EXCLUSAO',
    old_value: 'REGISTRO ATIVO',
    new_value: 'REMOVIDO',
    user_name: userName,
    reference_month: currentMonth
  }])

  // 2. Limpeza de Dependências (Para evitar erro de Foreign Key)
  // Apaga resultados de cálculos antigos
  await supabase.from('period_results').delete().eq('employee_id', id)
  
  // Apagar ajustes manuais
  await supabase.from('adjustments').delete().eq('employee_id', id)
  
  // Apagar faltas
  await supabase.from('absences').delete().eq('employee_id', id)

  // 3. Apagar o Funcionário finalmente
  const { error } = await supabase.from('employees').delete().eq('id', id)
  
  if (error) {
    // Retorna o erro exato se falhar
    return { error: `Erro ao excluir: ${error.message} (Código: ${error.code})` }
  }

  revalidatePath('/employees')
  return { success: true }
}