/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js' // Importação direta
import { revalidatePath } from 'next/cache'

// --- CLIENTE ADMIN (SERVICE ROLE) ---
// Usado APENAS para operações de auth.admin (Criar/Deletar contas)
const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// --- CRIAR USUÁRIO ---
export async function createNewUser(prevState: any, formData: FormData) {
  // Cliente normal para verificar permissão do usuário atual (Opcional)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Segurança: Verifica se quem está tentando criar é de fato um usuário logado
  if (!user) return { message: 'Você precisa estar logado.', type: 'error' }

  // Coleta dados
  const fullName = formData.get('fullName') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const role = formData.get('role') as string

  try {
    // 1. Cria o usuário usando o CLIENTE ADMIN (supabaseAdmin)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: role }
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('Erro ao gerar ID do usuário')

    // 2. Insere na tabela user_profiles usando o CLIENTE ADMIN (Bypass RLS)
    // Usamos o admin aqui também para garantir que o insert funcione mesmo que suas regras RLS sejam restritas
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: authData.user.id,
        email: email,
        full_name: fullName,
        role: role,
        created_at: new Date().toISOString()
      })

    if (profileError) {
        // Rollback: Se falhar ao criar o perfil, deleta a conta do Auth
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        throw profileError
    }

    revalidatePath('/settings/users')
    return { message: 'Usuário criado com sucesso!', type: 'success' }

  } catch (error: any) {
    console.error('Erro ao criar usuário:', error)
    return { message: error.message || 'Erro ao criar usuário', type: 'error' }
  }
}

// --- DELETAR USUÁRIO ---
export async function deleteUser(userId: string) {
  // Cliente normal para verificar permissão (opcional)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  try {
    // 1. Deleta do Auth usando CLIENTE ADMIN
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (error) throw error

    // 2. A deleção do perfil (user_profiles) geralmente acontece via CASCADE no banco.
    // Mas se não tiver cascade, usamos o admin para forçar:
    await supabaseAdmin.from('user_profiles').delete().eq('id', userId)

    revalidatePath('/settings/users')
    return { success: true }
  } catch (error: any) {
    console.error('Erro ao deletar:', error)
    return { error: error.message }
  }
}