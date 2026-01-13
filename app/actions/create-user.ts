/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// IMPORTANTE: Aqui usamos a biblioteca JS pura para usar a service_role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function createNewUser(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const role = formData.get('role') as string

  // 1. Criar usuário no Sistema de Autenticação (Auth)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Já cria confirmado para ele poder logar direto
    user_metadata: { full_name: fullName }
  })

  if (authError) {
    return { message: `Erro no Auth: ${authError.message}`, type: 'error' }
  }

  if (!authData.user) {
    return { message: 'Erro desconhecido ao criar usuário.', type: 'error' }
  }

  // 2. Inserir os dados na tabela 'user_profiles'
  // IMPORTANTE: Como sua tabela user_profiles usa EMAIL para vincular (pelo que vi antes),
  // vamos garantir que o email e a role sejam salvos.
  const { error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .insert({
      email: email, // Usando o email como chave conforme sua estrutura
      role: role,
      created_at: new Date().toISOString()
      // Adicione 'name' aqui se você criar essa coluna na tabela user_profiles depois
    })

  if (profileError) {
    // Opcional: Se falhar aqui, talvez fosse bom deletar o usuário do Auth para não ficar órfão
    return { message: `Usuário criado, mas falha no perfil: ${profileError.message}`, type: 'error' }
  }

  revalidatePath('/settings/users') // Atualiza a lista se você tiver uma
  return { message: 'Usuário criado com sucesso!', type: 'success' }
}