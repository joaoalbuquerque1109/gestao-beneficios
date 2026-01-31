/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type UpdateSettingsData = {
  dailyValueVA: number
  basketValue: number
  basketLimit: number
  cutoffDay: number
  businessDays: number // NOVO CAMPO
}

const LOCKED_STATUSES = ['APPROVED', 'APROVADO', 'CLOSED', 'FECHADO', 'EXPORTED', 'EXPORTADO', 'SELADO'];

// --- 1. Configuração Global ---
export async function updateGlobalSettings(data: UpdateSettingsData, userName: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('global_config').update({
      daily_value_va: data.dailyValueVA,
      basket_value: data.basketValue,
      basket_limit: data.basketLimit,
      cutoff_day: data.cutoffDay,
      business_days: data.businessDays, // Salva o novo campo
      updated_by: userName,
      updated_at: new Date().toISOString()
    }).eq('id', 1)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  revalidatePath('/calculation')
  return { success: true }
}

// --- 2. Listas Auxiliares (Genérico) ---
export async function manageListItem(table: 'departments' | 'locations' | 'employee_statuses', action: 'ADD' | 'DELETE' | 'TOGGLE', data: any) {
  const supabase = await createClient()
  let error = null

  if (action === 'ADD') {
    const id = data.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, '_')
    const { error: err } = await supabase.from(table).insert([{ id, name: data.name.toUpperCase(), status: 'ATIVO' }])
    error = err
  } 
  else if (action === 'DELETE') {
    const { error: err } = await supabase.from(table).delete().eq('id', data.id)
    error = err
  }
  else if (action === 'TOGGLE') {
    const newStatus = data.currentStatus === 'ATIVO' ? 'INATIVO' : 'ATIVO'
    const { error: err } = await supabase.from(table).update({ status: newStatus }).eq('id', data.id)
    error = err
  }

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

// --- 3. Períodos ---
export async function togglePeriodStatus(periodId: string, currentStatus: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('periods').update({ is_open: !currentStatus }).eq('id', periodId)
  
  if (error) return { error: error.message }
  revalidatePath('/settings')
  revalidatePath('/calculation')
  return { success: true }
}

// --- 4. Ações de Reset (PERIGO) ---
export async function resetSystem(type: 'EMPLOYEES' | 'ABSENCES' | 'CALCULATION', userEmail: string) {
  const supabase = await createClient()

  if (type === 'EMPLOYEES') {
    // 1. Descobrir quais funcionários estão vinculados a períodos bloqueados
    const { data: linkedEmployees } = await supabase
      .from('period_results')
      .select('employee_id, periods!inner(status)')
      .in('periods.status', LOCKED_STATUSES);

    const lockedIds = linkedEmployees?.map(r => r.employee_id) || [];

    // 2. Executar deleção seletiva
    // Apagamos dependências apenas de quem NÃO está travado
    const queryAbsences = supabase.from('absences').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const queryAdjusts = supabase.from('adjustments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const queryResults = supabase.from('period_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    if (lockedIds.length > 0) {
      // Se houver travas, não apagamos nada que pertença aos períodos selados
      queryAbsences.not('employee_id', 'in', `(${lockedIds.join(',')})`);
      queryAdjusts.not('employee_id', 'in', `(${lockedIds.join(',')})`);
      queryResults.not('employee_id', 'in', `(${lockedIds.join(',')})`);
    }

    await queryAbsences;
    await queryAdjusts;
    await queryResults;

    // 3. Apagar os funcionários que não estão em períodos bloqueados
    const employeeDelete = supabase.from('employees').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (lockedIds.length > 0) {
      employeeDelete.not('id', 'in', `(${lockedIds.join(',')})`);
    }

    const { error } = await employeeDelete;

    if (error) return { error: "Erro ao limpar base parcial: " + error.message };
    
    revalidatePath('/employees');
    return { success: true, message: lockedIds.length > 0 ? "Reset parcial concluído. Funcionários com histórico selado foram preservados." : "Reset total concluído." };
  }

  // Resets de Absences e Calculation seguem a mesma lógica de segurança
  if (type === 'ABSENCES' || type === 'CALCULATION') {
     const table = type === 'ABSENCES' ? 'absences' : 'period_results';
     
     // Aqui a trava é por período: só apaga o que não está nos LOCKED_STATUSES
     const { data: lockedPeriods } = await supabase.from('periods').select('name').in('status', LOCKED_STATUSES);
     const lockedNames = lockedPeriods?.map(p => p.name) || [];

     const deleteQuery = supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
     
     if (lockedNames.length > 0) {
        deleteQuery.not('period_id', 'in', `(${lockedNames.map(n => `'${n}'`).join(',')})`);
     }

     await deleteQuery;
  }

  revalidatePath('/settings');
  return { success: true };
}

export async function resetAdjustments(periodId: string, userEmail: string) {
  const supabase = await createClient()

  // 1. Verificação de Segurança: Busca o status do período
  const { data: period } = await supabase
    .from('periods')
    .select('status')
    .eq('id', periodId) // ou .eq('name', periodId) dependendo do seu esquema
    .single()

  // Se o período já estiver PROCESSADO ou FECHADO (onde o hash/auditoria já existe), bloqueia
  if (period?.status === 'PROCESSADO' || period?.status === 'FECHADO') {
    return { 
      error: 'Não é possível resetar ajustes de um período que já possui apuração processada ou fechada.' 
    }
  }

  // 2. Executa o delete apenas se o período estiver OPEN
  const { error } = await supabase
    .from('adjustments')
    .delete()
    .eq('period_id', periodId)

  if (error) return { error: error.message }

  // Log de auditoria (opcional, mas recomendado já que você citou auditoria)
  console.log(`Ajustes do período ${periodId} resetados por ${userEmail}`)

  revalidatePath('/adjustments')
  revalidatePath('/settings')
  return { success: true }
}