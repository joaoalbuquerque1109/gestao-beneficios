import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AdminLayoutWrapper from '@/components/AdminLayoutWrapper'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // 1. Verificação de Segurança (Server Side)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // 2. Renderiza o Layout Cliente
  return (
    <AdminLayoutWrapper>
      {children}
    </AdminLayoutWrapper>
  )
}