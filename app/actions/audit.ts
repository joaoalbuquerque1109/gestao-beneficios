'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

export async function sealPeriod(periodId: string, userName: string) {
  const supabase = await createClient()

  // 1. Buscar dados do período para gerar o hash
  const { data: period } = await supabase
    .from('periods')
    .select('*')
    .eq('id', periodId)
    .single()

  if (!period) return { error: 'Competência não encontrada.' }
  if (period.status !== 'APROVADO') return { error: 'Apenas competências APROVADAS podem ser seladas.' }

  // 2. Gerar Hash de Integridade (Assinatura Digital Simples)
  // Une ID + Valor + Funcionários + Uma chave secreta interna
  const secretString = `${period.id}|${period.total_value}|${period.total_employees}|VALEGESTÃO_V1`
  const hash = crypto.createHash('sha256').update(secretString).digest('hex').substring(0, 16).toUpperCase()

  // 3. Atualizar Tabela (Selar)
  const { error } = await supabase
    .from('periods')
    .update({
        status: 'EXPORTADO',
        exported_by: userName,
        exported_at: new Date().toISOString(),
        integrity_hash: hash
    })
    .eq('id', periodId)

  if (error) return { error: error.message }

  revalidatePath('/audit')
  revalidatePath('/approval')
  return { success: true, hash }
}