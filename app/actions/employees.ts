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

  const admissionDate = data.admissionDate ? data.admissionDate : null
  const birthDate = data.birthDate ? data.birthDate : null
  
  const statusStartDate = data.statusStartDate ? data.statusStartDate : null
  const statusEndDate = data.statusEndDate ? data.statusEndDate : null

  const employeeData: any = {
    id: data.id,
    name: data.name.toUpperCase(),
    cpf: cpfClean,
    role: data.role.toUpperCase(),
    department_id: data.department,
    location_id: data.location,
    salary: parseFloat(data.salary),
    admission_date: admissionDate,
    birth_date: birthDate,
    status: data.status,
    status_start_date: statusStartDate,
    status_end_date: statusEndDate
  }

  if (isEdit) {
    const { data: oldEmp } = await supabase.from('employees').select('*').eq('id', data.id).single()
    const { error } = await supabase.from('employees').update(employeeData).eq('id', data.id)
    if (error) return { error: error.message }

    if (oldEmp && oldEmp.salary !== employeeData.salary) {
        await supabase.from('movements').insert([{
        employee_id: data.id,
        employee_name: data.name,
        type: 'EDICAO_DADOS',
        old_value: `Salário: ${oldEmp.salary}`,
        new_value: `Salário: ${data.salary}`,
        user_name: user,
        reference_month: currentMonth
        }])
    }
  } else {
    const { error } = await supabase.from('employees').insert([employeeData])
    if (error) return { error: error.message }

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

// --- IMPORTAÇÃO EM MASSA (Criação/Substituição Completa) ---
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

// --- ATUALIZAÇÃO DE STATUS EM MASSA (NOVO) ---
export async function updateStatusBatch(updates: any[], user: string) {
    const supabase = await createClient()
    const currentMonth = new Date().toISOString().slice(0, 7)
    const errors: string[] = []
    let successCount = 0
  
    // Processamento paralelo para melhor performance
    const promises = updates.map(async (update) => {
        const { id, name, status, status_start_date, status_end_date } = update

        // Objeto de atualização (apenas campos necessários)
        const updateData: any = { status }
        if (status_start_date !== undefined) updateData.status_start_date = status_start_date
        if (status_end_date !== undefined) updateData.status_end_date = status_end_date

        const { error } = await supabase.from('employees').update(updateData).eq('id', id)

        if (error) {
            errors.push(`Erro ID ${id}: ${error.message}`)
        } else {
            successCount++
            // Opcional: Registrar movimento se desejar histórico
            if (status === 'DEMITIDO' || status === 'FERIAS') {
                 await supabase.from('movements').insert([{
                    employee_id: id,
                    employee_name: name,
                    type: status === 'DEMITIDO' ? 'DEMISSAO_MASSA' : 'FERIAS_MASSA',
                    new_value: status,
                    user_name: user,
                    reference_month: currentMonth
                 }])
            }
        }
    })

    await Promise.all(promises)
    
    revalidatePath('/employees')
    return { success: true, count: successCount, errors }
}

// --- EXCLUSÃO ---
export async function deleteEmployee(id: string, name: string, userName: string) {
  const supabase = await createClient()
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

  await supabase.from('period_results').delete().eq('employee_id', id)
  await supabase.from('adjustments').delete().eq('employee_id', id)
  await supabase.from('absences').delete().eq('employee_id', id)

  const { error } = await supabase.from('employees').delete().eq('id', id)
  
  if (error) {
    return { error: `Erro ao excluir: ${error.message} (Código: ${error.code})` }
  }

  revalidatePath('/employees')
  return { success: true }
}