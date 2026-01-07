import { createClient } from '@/utils/supabase/server'
import { Users, DollarSign, AlertTriangle, Calendar } from 'lucide-react'

// Dashboard Principal (Server Component)
export default async function DashboardPage() {
  const supabase = await createClient()

  // Busca dados reais do banco
  const { count: totalEmployees } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'ATIVO')

  // Simulação de outros dados (migraremos a lógica de cálculo depois)
  const stats = {
    totalEmployees: totalEmployees || 0,
    totalEstimated: 0, // Implementaremos o cálculo real depois
    alerts: 0,
    currentPeriod: new Date().toISOString().slice(0, 7) // YYYY-MM
  }

  const kpiCards = [
    { label: 'Funcionários Ativos', value: stats.totalEmployees, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Estimativa Mensal', value: 'R$ 0,00', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Alertas de Cesta', value: stats.alerts, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Período Atual', value: stats.currentPeriod, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
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

      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
        <p>Os gráficos e cálculos detalhados serão implementados na próxima etapa.</p>
      </div>
    </div>
  )
}