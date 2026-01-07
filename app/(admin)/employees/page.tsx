import { createClient } from '@/utils/supabase/server'
import EmployeeClient from './employee-client'

export default async function EmployeesPage() {
  const supabase = await createClient()

  // 1. Busca o usuário logado para passar ao componente (usado no log de movimentação)
  const { data: { user } } = await supabase.auth.getUser()

  // 2. Busca a lista atualizada de funcionários
  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .order('name')

  return (
    <EmployeeClient 
      initialEmployees={employees || []} 
      user={user} 
    />
  )
}