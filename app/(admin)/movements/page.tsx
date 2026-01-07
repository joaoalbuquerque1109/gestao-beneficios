import { createClient } from '@/utils/supabase/server'
import MovementsClient from './movements-client'

export default async function MovementsPage() {
  const supabase = await createClient()

  const { data: movements } = await supabase
    .from('movements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500) // Limite de segurança inicial

  return (
    <MovementsClient initialMovements={movements || []} />
  )
}