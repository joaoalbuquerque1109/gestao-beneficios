import { createClient } from '@/utils/supabase/server'
import AbsencesClient from './absences-client'

export default async function AbsencesPage() {
  const supabase = await createClient()

  // Busca faltas E o nome do funcionário relacionado
  const { data: absences } = await supabase
    .from('absences')
    .select('*, employees(name)')
    .order('date', { ascending: false })
    .limit(1000)

  // Tratamento para o caso de funcionário excluído (o left join retorna null)
  const safeAbsences = absences?.map(a => ({
    ...a,
    employees: a.employees || { name: 'Funcionário Removido' }
  })) || []

  return (
    <AbsencesClient initialAbsences={safeAbsences} />
  )
}