'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function approvePeriod(periodId: string) {
  const supabase = await createClient()
  
  // 1. Verifica quem está tentando aprovar
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Usuário não autenticado' }

  // 2. Opcional: Verificar se o usuário é ADMIN ou RH no banco aqui também
  // ... (pode usar a lógica de user_profiles se quiser segurança extra no back-end)

  // 3. Atualiza o status
  const { error } = await supabase
    .from('periods')
    .update({ 
      status: 'APPROVED',
      approved_by: user.id,
      approved_at: new Date().toISOString()
    })
    .eq('id', periodId)

  if (error) {
    return { error: 'Erro ao aprovar competência' }
  }

  revalidatePath('/calculation') // Atualiza a tela
  return { success: true }
}

// Função para reabrir caso precisem corrigir algo
export async function reopenPeriod(periodId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('periods')
    .update({ 
      status: 'OPEN',
      approved_by: null,
      approved_at: null
    })
    .eq('id', periodId)

  if (error) return { error: 'Erro ao reabrir' }

  revalidatePath('/calculation')
  return { success: true }
}