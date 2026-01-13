import { createClient } from '@/utils/supabase/server'
import CalculationClient from './calculation-client'

export default async function CalculationPage() {
  const supabase = await createClient()
  
  // 1. Busca o usuário autenticado
  const { data: { user } } = await supabase.auth.getUser()

  // 2. Busca o Perfil (Role) para saber se é ADMIN/RH
  // Definimos um padrão 'USER' caso não encontre
  let userRole = 'USER'

  if (user?.email) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .ilike('email', user.email) // Mesmo fix do ilike da sidebar
      .single()
    
    if (profile) {
      userRole = profile.role
    }
  }

  // 3. Busca lista de períodos ordenados pelo mais recente
  const { data: periods } = await supabase
    .from('periods')
    .select('*')
    .order('id', { ascending: false })

  // 4. Passamos a role e o user para o componente cliente
  return (
    <CalculationClient 
      periods={periods || []} 
      user={user} 
      userRole={userRole} 
    />
  )
}