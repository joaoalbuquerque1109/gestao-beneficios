import { createClient } from '@/utils/supabase/server'
import Link from 'next/link' // <--- 1. IMPORTAÇÃO ADICIONADA
import { 
  Users, DollarSign, AlertTriangle, Calendar, Building2, 
  UserX, TrendingUp, Activity, Briefcase, UserCheck, ChevronRight 
} from 'lucide-react'

// --- TIPAGEM ---
type DashboardStats = {
  active: number
  inss: number
  sick: number
  maternity: number
  vacation: number
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

  const { data: statsData, error: statsError } = await supabase.rpc('get_dashboard_stats')
  const { data: deptData, error: deptError } = await supabase.rpc('get_department_costs') 

  if (statsError || deptError) {
    console.error("Erro no dashboard:", statsError || deptError)
  }

  const stats = (statsData as unknown as DashboardStats) || {
    active: 0, inss: 0, sick: 0, maternity: 0, vacation: 0, fired: 0, inactive: 0, total: 0, ticket_value: 0, total_estimated: 0
  }
  
  const departmentCosts = ((deptData as DepartmentCost[]) || []).sort((a, b) => b.total_cost - a.total_cost)

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  const currentDate = new Date()
  const currentPeriod = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const formattedPeriod = currentPeriod.charAt(0).toUpperCase() + currentPeriod.slice(1)

  // --- 2. ADICIONADO HREF NOS CARDS ---
  const kpiCards = [
    { 
      label: 'Funcionários Ativos', 
      value: stats.active, 
      sub: 'Total na folha',
      icon: Users, 
      color: 'text-blue-600', 
      bg: 'bg-blue-100',
      href: '/employees' // <--- Link para Funcionários
    },
    { 
      label: 'Estimativa Mensal', 
      value: formatCurrency(stats.total_estimated), 
      sub: 'Previsão de custo',
      icon: DollarSign, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-100',
      href: '/calculation' // <--- Link para Apuração/Cálculo
    },
    { 
      label: 'Período Atual', 
      value: formattedPeriod, 
      sub: 'Competência',
      icon: Calendar, 
      color: 'text-purple-600', 
      bg: 'bg-purple-100',
      href: null // Sem link
    },
    { 
      label: 'Alertas / Pendências', 
      value: 0, 
      sub: 'Ações requeridas',
      icon: AlertTriangle, 
      color: 'text-amber-600', 
      bg: 'bg-amber-100',
      href: null // Sem link
    },
  ]

  const absences = [
    { label: 'Férias', value: stats.vacation, color: 'bg-teal-500' },
    { label: 'Afastado INSS', value: stats.inss, color: 'bg-slate-500' },
    { label: 'Licença Médica', value: stats.sick, color: 'bg-red-500' },
    { label: 'Licença Maternidade', value: stats.maternity, color: 'bg-pink-500' },
  ]

  const attrition = [
    { label: 'Desligados', value: stats.fired, icon: UserX, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Inativos', value: stats.inactive, icon: UserCheck, color: 'text-slate-500', bg: 'bg-slate-100' },
  ]

  return (
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Dashboard Geral</h1>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
                <Activity size={16} className="text-blue-500"/> 
                Visão consolidada da folha de benefícios
            </p>
        </div>
      </div>

      {/* 3. LÓGICA DE RENDERIZAÇÃO ATUALIZADA (LINK VS DIV) */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {kpiCards.map((card, idx) => {
          // Conteúdo interno do Card
          const CardContent = (
            <div className="flex justify-between items-start h-full">
              <div className="flex flex-col justify-between h-full">
                <div>
                    <p className="text-sm font-semibold text-slate-500 mb-1">{card.label}</p>
                    <h3 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">{card.value}</h3>
                    <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
                </div>
                
                {/* Indicador visual de clique se houver link */}
                {card.href && (
                    <div className="mt-2 text-xs font-bold text-blue-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Acessar <ChevronRight size={12}/>
                    </div>
                )}
              </div>
              <div className={`p-3 rounded-xl ${card.bg} ${card.color} group-hover:scale-110 transition-transform`}>
                <card.icon size={24} />
              </div>
            </div>
          )

          // Estilo base do card
          const baseClasses = "bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-200 group h-full relative"

          // Se tiver href, usa Link. Se não, usa div.
          if (card.href) {
            return (
              <Link href={card.href} key={idx} className="block h-full">
                <div className={`${baseClasses} hover:ring-2 hover:ring-blue-100 cursor-pointer`}>
                   {CardContent}
                </div>
              </Link>
            )
          }

          return (
            <div key={idx} className={baseClasses}>
              {CardContent}
            </div>
          )
        })}
      </section>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* 2. CUSTOS POR SECRETARIA (Corrigido para a barra visual refletir a % real do total) */}
        <section className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Building2 size={20} className="text-blue-600" />
              Custo por Secretaria
            </h3>
            <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                {departmentCosts.length} Unidades
            </span>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar max-h-125">
            {departmentCosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                    <Briefcase size={32} className="mb-2 opacity-50"/>
                    <p>Nenhum dado financeiro encontrado.</p>
                </div>
            ) : (
                departmentCosts.map((dept, idx) => {
                    // Calcula o total baseado APENAS no que está sendo exibido na lista para fechar 100%
                    const totalDisplayed = departmentCosts.reduce((acc, curr) => acc + curr.total_cost, 0) || 1
                    // A porcentagem real em relação à soma desta lista
                    const percentOfTotal = (dept.total_cost / totalDisplayed) * 100
                    return (
                        <div key={idx} className="group">
                            <div className="flex justify-between items-end mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-700 text-sm uppercase tracking-wide truncate max-w-50">
                                        {dept.department_id ? dept.department_id.replace(/_/g, ' ') : 'NÃO DEFINIDO'}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="block font-bold text-slate-800">{formatCurrency(dept.total_cost)}</span>
                                </div>
                            </div>
                            {/* Barra Visual CORRIGIDA: Usa `percentOfTotal` para refletir o valor real */}
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                <div 
                                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000 ease-out group-hover:bg-blue-500 relative" 
                                    style={{ width: `${percentOfTotal}%` }}
                                >
                                </div>
                            </div>
                            <div className="flex justify-between mt-1">
                                <span className="text-[10px] text-slate-400 font-medium">
                                    {dept.active_count} funcionários
                                </span>
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 rounded">
                                    {percentOfTotal.toFixed(1)}% do Total
                                </span>
                            </div>
                        </div>
                    )
                })
            )}
          </div>
        </section>
        {/* COLUNA LATERAL */}
        <div className="space-y-6">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <Calendar size={20} className="text-orange-500" />
                    Ausências no Mês
                </h3>
                <div className="space-y-3">
                    {absences.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${item.color} shadow-sm`}></div>
                                <span className="text-sm font-medium text-slate-600">{item.label}</span>
                            </div>
                            <span className="font-bold text-slate-800">{item.value}</span>
                        </div>
                    ))}
                    {absences.every(a => a.value === 0) && (
                        <p className="text-xs text-center text-slate-400 py-2">Nenhuma ausência registrada.</p>
                    )}
                </div>
            </section>

            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <TrendingUp size={20} className="text-slate-500" />
                    Outros Status
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    {attrition.map((item, idx) => (
                        <div key={idx} className={`p-4 rounded-xl ${item.bg} flex flex-col items-center justify-center text-center border border-transparent hover:border-slate-200 transition-all`}>
                            <item.icon size={20} className={`mb-2 ${item.color}`}/>
                            <span className={`text-2xl font-bold ${item.color}`}>{item.value}</span>
                            <span className="text-xs font-medium text-slate-500 uppercase mt-1">{item.label}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-400">Total de registros na base</p>
                    <p className="text-lg font-bold text-slate-700">{stats.total}</p>
                </div>
            </section>
        </div>
      </div>
    </div>
  )
}