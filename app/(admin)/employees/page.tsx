import { createClient } from '@/utils/supabase/server'
import EmployeeClient from './employee-client'

// Força a página a ser dinâmica para não cachear dados antigos
export const dynamic = 'force-dynamic'

export default async function EmployeesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Buscar Funcionários (AUMENTA O LIMITE PARA 10.000)
  //'id','name', 'cpf', 'role', 'department_id', 'location_id', 'salary', 'admission_date', 'birth_date', 'status', 'created_at'
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, cpf, role, department_id, location_id, salary, admission_date, birth_date, status, created_at')

  // 2. Buscar Departamentos
  const { data: departments } = await supabase
    .from('departments')
    .select('*')
    .eq('status', 'ATIVO')
    .order('name')

  // 3. Buscar Filiais
  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .eq('status', 'ATIVO')
    .order('name')

  return (
    <EmployeeClient 
      initialEmployees={employees || []} 
      departments={departments || []}
      locations={locations || []}
      user={user} 
    />
  )
}