import { createClient } from '@/utils/supabase/server'
import CalculationClient from './calculation-client'

export default async function CalculationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Busca lista de períodos já processados
  const { data: periods } = await supabase
    .from('periods')
    .select('*')
    .order('id', { ascending: false })

  return <CalculationClient periods={periods || []} user={user} />
}