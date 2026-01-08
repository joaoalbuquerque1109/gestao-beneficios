import { createClient } from '@/utils/supabase/server'
import { Users, DollarSign, AlertTriangle, Calendar } from 'lucide-react'

// Dashboard Principal (Server Component)
export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Busca Salários e Contagem dos Ativos
  // ALTERAÇÃO: Removemos 'head: true' e selecionamos a coluna 'salary' para poder somar
  const { data: activeEmployees, count: totalEmployees } = await supabase
    .from('employees')
    .select('salary', { count: 'exact' }) 
    .eq('status', 'ATIVO')

  // 2. Cálculo da Soma dos Salários (Folha Estimada)
  const totalSalary = activeEmployees?.reduce((acc, curr) => {
    return acc + (Number(curr.salary) || 0)
  }, 0) || 0

  // 3. Formatação para Moeda (BRL)
  const formattedEstimate = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(totalSalary)

  // 4. Definição do Período Atual (Mês/Ano por extenso)
  const currentDate = new Date()
  const currentPeriod = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const formattedPeriod = currentPeriod.charAt(0).toUpperCase() + currentPeriod.slice(1)

  // 5. Montagem dos Cards (Mantendo o Layout Original)
  const stats = {
    totalEmployees: totalEmployees || 0,
    totalEstimated: formattedEstimate,
    alerts: 0, // Lógica de alertas pode ser implementada futuramente (ex: cadastros incompletos)
    period: formattedPeriod
  }

  const kpiCards = [
    { 
      label: 'Funcionários Ativos', 
      value: stats.totalEmployees, 
      icon: Users, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50' 
    },
    { 
      label: 'Estimativa Mensal', 
      value: stats.totalEstimated, 
      icon: DollarSign, 
      color: 'text-green-600', 
      bg: 'bg-green-50' 
    },
    { 
      label: 'Alertas de Cesta', 
      value: stats.alerts, 
      icon: AlertTriangle, 
      color: 'text-orange-600', 
      bg: 'bg-orange-50' 
    },
    { 
      label: 'Período Atual', 
      value: stats.period, 
      icon: Calendar, 
      color: 'text-purple-600', 
      bg: 'bg-purple-50' 
    },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
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
        <p>Os gráficos e cálculos detalhados de benefícios serão implementados na próxima etapa.</p>
      </div>
    </div>
  )
}