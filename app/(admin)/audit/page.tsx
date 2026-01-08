import { createClient } from '@/utils/supabase/server'
import AuditClient from './audit-client'

export default async function AuditPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Busca Histórico (Já Exportados)
  const { data: history } = await supabase
    .from('periods')
    .select('*')
    .eq('status', 'EXPORTADO')
    .order('exported_at', { ascending: false })

  // 2. Busca Pendentes (Para o botão de ação rápida)
  const { data: approved } = await supabase
    .from('periods')
    .select('*')
    .eq('status', 'APROVADO')
    .order('id', { ascending: false })

  return (
    <AuditClient 
        records={history || []} 
        approvedPeriods={approved || []} 
        user={user} 
    />
  )
}