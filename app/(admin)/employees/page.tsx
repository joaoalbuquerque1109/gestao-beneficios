import { createClient } from '@/utils/supabase/server'
import EmployeeClient from './employee-client'

// --- ADICIONE ESTA LINHA ---
export const dynamic = 'force-dynamic'

export default async function EmployeesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Buscar Funcionários (Garante até 10.000 registros)
  const { data: employees } = await supabase
    .from('employees')
    .select('*')

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