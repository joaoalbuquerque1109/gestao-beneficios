import { createClient } from '@/utils/supabase/server'

/**
 * Camada centralizada de acesso ao banco de dados
 * Otimiza queries e melhora performance
 */

export async function getEmployeesList(params?: { limit?: number; offset?: number; status?: string }) {
  const supabase = await createClient()
  const limit = params?.limit || 50
  const offset = params?.offset || 0

  let query = supabase.from('employees').select(
    'id, name, cpf, role, salary, status, admission_date, department_id, location_id',
    { count: 'exact' }
  ).order('name', { ascending: true })

  if (params?.status) {
    query = query.eq('status', params.status)
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1)

  if (error) {
    console.error('Erro ao buscar funcionários:', error)
    return { data: [], error: error.message, total: 0 }
  }

  return { data: data || [], error: null, total: count || 0 }
}

export async function getPeriodsList(params?: { limit?: number; offset?: number; status?: string }) {
  const supabase = await createClient()
  const limit = params?.limit || 50
  const offset = params?.offset || 0

  let query = supabase.from('periods').select(
    'id, month, year, status, created_at, approved_at',
    { count: 'exact' }
  ).order('year', { ascending: false }).order('month', { ascending: false })

  if (params?.status) {
    query = query.eq('status', params.status)
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1)

  if (error) {
    console.error('Erro ao buscar períodos:', error)
    return { data: [], error: error.message, total: 0 }
  }

  return { data: data || [], error: null, total: count || 0 }
}

export async function getUsersList(params?: { limit?: number; offset?: number }) {
  const supabase = await createClient()

  const { data: user_profiles, error } = await supabase
    .from('user_profiles')
    .select('*')

  if (error) {
    console.error('Erro ao buscar usuários:', error)
    return { data: [], error: error.message, total: 0 }
  }

  return { data: user_profiles || [], error: null, total: user_profiles?.length || 0 }
}
