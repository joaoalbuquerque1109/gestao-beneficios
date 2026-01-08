import { createClient } from '@/utils/supabase/server'
import SettingsClient from './settings-client'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Config Global
  const { data: config } = await supabase.from('global_config').select('*').single()
  
  // 2. Períodos (Ordenados por ID decrescente para ver os mais novos primeiro)
  const { data: periods } = await supabase.from('periods').select('*').order('id', { ascending: false })

  // 3. Listas Auxiliares
  const { data: depts } = await supabase.from('departments').select('*').order('name')
  const { data: locs } = await supabase.from('locations').select('*').order('name')
  const { data: stats } = await supabase.from('employee_statuses').select('*').order('name')

  // Fallbacks
  const defaultConfig = {
    daily_value_va: 15.00,
    basket_value: 142.05,
    basket_limit: 1780.00,
    cutoff_day: 15
  }

  return (
    <SettingsClient 
      initialConfig={config || defaultConfig} 
      departments={depts || []}
      locations={locs || []}
      statuses={stats || []}
      periods={periods || []}
      user={user} 
    />
  )
}