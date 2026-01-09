'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function processPeriod(periodInput: string, userEmail: string) {
  const supabase = await createClient()
  let targetId = periodInput

  // --- PASSO 1: Resolver o UUID do Período ---
  // Verifica se o input é um UUID válido. Se NÃO for (ex: "2026-01"), precisamos buscar o ID no banco.
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(periodInput)

  if (!isUUID) {
    // 1. Tenta encontrar o período pelo nome (Ex: "2026-01")
    const { data: existingPeriod } = await supabase
      .from('periods')
      .select('id')
      .eq('name', periodInput)
      .single()

    if (existingPeriod) {
      targetId = existingPeriod.id
    } else {
      // 2. Se não existir, CRIA um novo período automaticamente
      const { data: newPeriod, error: createError } = await supabase
        .from('periods')
        .insert({ 
          name: periodInput,   // Salva "2026-01" na coluna name
          status: 'RASCUNHO',
          total_employees: 0,
          total_value: 0
        })
        .select('id')
        .single()
      
      if (createError) {
        return { error: 'Erro ao criar período: ' + createError.message }
      }
      targetId = newPeriod.id
    }
  }

  // --- PASSO 2: Executar o Cálculo (RPC) usando o UUID correto ---
  const { error: rpcError } = await supabase.rpc('calculate_benefits_batch', {
    target_period_id: targetId
  })

  if (rpcError) {
    console.error('Erro no RPC:', rpcError)
    return { error: 'Falha no processamento: ' + rpcError.message }
  }

  // --- PASSO 3: Atualizar Totais e Status ---
  // Busca os totais calculados na tabela period_results
  const { data: results, error: sumError } = await supabase
    .from('period_results')
    .select('total_receivable')
    .eq('period_id', targetId)

  if (sumError) {
    return { error: 'Erro ao totalizar resultados: ' + sumError.message }
  }

  const totalValue = results?.reduce((acc, curr) => acc + (Number(curr.total_receivable) || 0), 0) || 0
  const count = results?.length || 0

  // Atualiza o status do período para PROCESSADO
  const { error: updateError } = await supabase
    .from('periods')
    .update({ 
        status: 'PROCESSADO',
        total_employees: count,
        total_value: totalValue,
        processed_by: userEmail,
        processed_at: new Date().toISOString()
    })
    .eq('id', targetId)
  
  if (updateError) {
    return { error: 'Erro ao atualizar status do período: ' + updateError.message }
  }

  revalidatePath('/calculation')
  
  return { 
    success: true, 
    count: count, 
    total: totalValue 
  }
}