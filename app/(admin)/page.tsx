import { createClient } from '@/utils/supabase/server'
import { Users, DollarSign, AlertTriangle, Calendar, Building2, UserX, Baby } from 'lucide-react'

// Tipagem atualizada com 'maternity'
type DashboardStats = {
  active: number
  inss: number
  sick: number
  maternity: number // Novo campo
  fired: number
  inactive: number
  total: number
  ticket_value: number
  total_estimated: number
}

type DepartmentCost = {
  department_id: string
  active_count: number
  total_cost: number
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Chamada RPC: Busca todas as estatísticas
  const { data: statsData, error: statsError } = await supabase
    .rpc('get_dashboard_stats')

  // 2. Chamada View: Busca lista de custos
  const { data: deptData, error: deptError } = await supabase
    .from('view_department_costs')
    .select('*')

  if (statsError || deptError) {
    console.error("Erro no dashboard:", statsError || deptError)
  }

  // Inicializa com zeros caso falhe
  const stats = (statsData as unknown as DashboardStats) || {
    active: 0, inss: 0, sick: 0, maternity: 0, fired: 0, inactive: 0, total: 0, total_estimated: 0
  }
  
  const departmentCosts = (deptData as DepartmentCost[]) || []

  // Formatadores
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val)

  const currentDate = new Date()
  const currentPeriod = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const formattedPeriod = currentPeriod.charAt(0).toUpperCase() + currentPeriod.slice(1)

  // Cards Principais (KPIs)
  const kpiCards = [
    { 
      label: 'Funcionários Ativos', 
      value: stats.active, 
      icon: Users, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50' 
    },
    { 
      label: 'Estimativa Mensal', 
      value: formatCurrency(stats.total_estimated), 
      icon: DollarSign, 
      color: 'text-green-600', 
      bg: 'bg-green-50' 
    },
    { 
      label: 'Alertas de Cesta', 
      value: 0, 
      icon: AlertTriangle, 
      color: 'text-orange-600', 
      bg: 'bg-orange-50' 
    },
    { 
      label: 'Período Atual', 
      value: formattedPeriod, 
      icon: Calendar, 
      color: 'text-purple-600', 
      bg: 'bg-purple-50' 
    },
  ]

  // Cards de Situação (Atualizado com Maternidade)
  const statusCards = [
    { label: 'INSS', value: stats.inss, color: 'text-slate-600', border: 'border-slate-200' },
    { label: 'Afastado Doença', value: stats.sick, color: 'text-red-600', border: 'border-red-200' },
    { label: 'Licença Maternidade', value: stats.maternity, color: 'text-pink-600', border: 'border-pink-200' }, // Novo Card
    { label: 'Demitidos', value: stats.fired, color: 'text-gray-600', border: 'border-gray-200' },
    { label: 'Inativos', value: stats.inactive, color: 'text-slate-400', border: 'border-slate-200' },
  ]

  return (
    <div className="space-y-8">
      {/* Seção 1: KPIs */}
      <section>
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Visão Geral</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiCards.map((card, idx) => (
            <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">{card.label}</p>
                  <h3 className="text-2xl font-bold text-slate-800 mt-1">{card.value}</h3>
                </div>
                <div className={`p-3 rounded-lg ${card.bg} ${card.color}`}>
                  <card.icon size={24} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Seção 2: Custos por Secretaria */}
        <section className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Building2 size={20} className="text-slate-500" />
              Custo Estimado por Secretaria
            </h3>
          </div>
          
          <div className="space-y-4 max-h-100 overflow-y-auto pr-2 custom-scrollbar">
            {departmentCosts.map((dept, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                <div>
                  <p className="font-medium text-slate-700 capitalize">
                    {dept.department_id ? dept.department_id.toLowerCase().replace(/_/g, ' ') : 'sem secretaria'}
                  </p>
                  <p className="text-xs text-slate-500">{dept.active_count} funcionários ativos</p>
                </div>
                <p className="font-bold text-slate-800">{formatCurrency(dept.total_cost)}</p>
              </div>
            ))}
            {departmentCosts.length === 0 && (
              <p className="text-center text-slate-500 py-4">Nenhum dado encontrado.</p>
            )}
          </div>
        </section>

        {/* Seção 3: Status Detalhado */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <UserX size={20} className="text-slate-500" />
              Situação dos Funcionários
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {statusCards.map((card, idx) => (
              <div key={idx} className={`p-4 rounded-lg border ${card.border} bg-white flex justify-between items-center`}>
                <span className={`font-medium ${card.color}`}>{card.label}</span>
                <span className={`text-xl font-bold ${card.color}`}>{card.value}</span>
              </div>
            ))}
            
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-sm text-slate-500">
              <span>Total Registros</span>
              <span>{stats.total}</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}