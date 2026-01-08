import { createClient } from '@/utils/supabase/server'
import ApprovalClient from './approval-client'

export default async function ApprovalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Buscar períodos processados ou aprovados
  const { data: periods } = await supabase
    .from('periods')
    .select('*')
    .in('status', ['PROCESSADO', 'APROVADO', 'EXPORTADO'])
    .order('id', { ascending: false })

  return <ApprovalClient periods={periods || []} user={user} />
}