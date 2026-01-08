'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function approvePeriod(periodId: string, userName: string) {
  const supabase = await createClient()

  // 1. Atualiza status do período
  const { error } = await supabase
    .from('periods')
    .update({
        status: 'APROVADO',
        is_open: false,
        approved_by: userName,
        approved_at: new Date().toISOString()
    })
    .eq('id', periodId)

  if (error) return { error: error.message }

  // Opcional: Criar log de auditoria aqui também
  revalidatePath('/approval')
  revalidatePath('/calculation') // Atualiza a tela de cálculo para mostrar "Bloqueado"
  return { success: true }
}