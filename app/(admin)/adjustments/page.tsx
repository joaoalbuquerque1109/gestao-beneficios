import { createClient } from '@/utils/supabase/server'
import AdjustmentsClient from './adjustments-client'

export default async function AdjustmentsPage() {
  const supabase = await createClient()
  
  // Busca ajustes + nome do funcionário
  const { data: adjustments } = await supabase
    .from('adjustments')
    .select('*, employees(name)')
    .order('created_at', { ascending: false })

  return <AdjustmentsClient initialAdjustments={adjustments || []} />
}