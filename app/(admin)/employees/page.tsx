import { createClient } from '@/utils/supabase/server'
import EmployeeClient from './employee-client'

// Força a página a ser dinâmica para não cachear dados antigos
export const dynamic = 'force-dynamic'

export default async function EmployeesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. MANUTENÇÃO AUTOMÁTICA DE STATUS
  // Antes de buscar os dados, rodamos a função que verifica se as férias acabaram.
  // Se acabaram, o funcionário volta a ser ATIVO automaticamente.
  await supabase.rpc('check_and_update_expired_status')

  // 2. Buscar Funcionários
  // Importante: Incluímos status_start_date e status_end_date no select
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, cpf, role, department_id, location_id, salary, admission_date, birth_date, status, created_at, status_start_date, status_end_date')
    .order('name')

  // 3. Buscar Departamentos
  const { data: departments } = await supabase
    .from('departments')
    .select('*')
    .eq('status', 'ATIVO')
    .order('name')

  // 4. Buscar Filiais
  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .eq('status', 'ATIVO')
    .order('name')

  // 5. Buscar Configurações Globais
  // Necessário para o cálculo do desconto de VA no modal
  const { data: globalConfig } = await supabase
    .from('global_config')
    .select('*')
    .limit(1)
    .single()

  return (
    <EmployeeClient 
      initialEmployees={employees || []} 
      departments={departments || []}
      locations={locations || []}
      user={user}
      // Passamos a configuração para o cliente calcular o impacto financeiro
      globalConfig={globalConfig || {}} 
    />
  )
}