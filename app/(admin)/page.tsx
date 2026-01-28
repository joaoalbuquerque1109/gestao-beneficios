import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { 
  Users, DollarSign, Calendar, Building2, 
  UserX, TrendingUp, Activity, Briefcase, UserCheck, ChevronRight, AlertTriangle 
} from 'lucide-react'
import { getBusinessDaysBetween } from '@/utils/date-helpers' // Certifique-se que este helper existe ou use date-fns

// --- TIPAGEM ---
type DashboardStats = {
  active: number
  inss: number
  sick: number
  maternity: number
  vacation: number
  fired: number
  inactive: number
  notice: number // Adicionado Aviso Prévio
  total: number
  total_estimated: number
}

type DepartmentCost = {
  department_id: string
  active_count: number
  total_cost: number
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Busca Configurações Globais
  const { data: config } = await supabase.from('global_config').select('*').single()
  
  const DAILY_VA = Number(config?.daily_value_va)
  const BASKET_VAL = Number(config?.basket_value)
  const BASKET_LIMIT = Number(config?.basket_limit)
  const BUSINESS_DAYS = Number(config?.business_days)
  const CUTOFF_DAY = Number(config?.cutoff_day)

  // 2. Define a Janela de Apuração (Tempo Real)
  const today = new Date()
  let endWindow = new Date(today.getFullYear(), today.getMonth(), CUTOFF_DAY)
  // Se hoje já passou do dia de corte, o alvo é o próximo mês
  if (today.getDate() > CUTOFF_DAY) {
      endWindow = new Date(today.getFullYear(), today.getMonth() + 1, CUTOFF_DAY)
  }
  const startWindow = new Date(endWindow.getFullYear(), endWindow.getMonth() - 1, CUTOFF_DAY)

  // 3. Busca Dados (Funcionários e Ausências da Janela)
  const [empRes, absRes] = await Promise.all([
    supabase.from('employees').select('*').neq('status', 'INATIVO'), // Traz tudo menos inativos antigos
    supabase.from('absences').select('*').gt('date', startWindow.toISOString()).lte('date', endWindow.toISOString())
  ])

  const employees = empRes.data || []
  const absences = absRes.data || []

  // 4. Processamento dos Dados (Lógica TypeScript)
  const stats: DashboardStats = {
      active: 0, inss: 0, sick: 0, maternity: 0, vacation: 0, fired: 0, inactive: 0, notice: 0, total: 0, total_estimated: 0
  }
  
  const deptMap: Record<string, { count: number, cost: number }> = {}

  employees.forEach(emp => {
      // --- A. Contadores de Status ---
      stats.total++
      
      switch (emp.status) {
          case 'ATIVO': stats.active++; break;
          case 'AFASTADO INSS': stats.inss++; break;
          case 'AFASTADO DOENCA': stats.sick++; break;
          case 'MATERNIDADE': stats.maternity++; break;
          case 'FERIAS': stats.vacation++; break;
          case 'DEMITIDO': stats.fired++; break;
          case 'AVISO PREVIO TRABALHADO': stats.notice++; break; // Conta Aviso Prévio
          default: break;
      }

      // --- B. Cálculo Financeiro Individual ---
      
      // Filtra faltas deste funcionário
      const empAbsences = absences.filter(a => a.employee_id === emp.id)
      const countUnjustified = empAbsences.filter(a => a.type === 'INJUSTIFICADA').length
      const countJustified = empAbsences.filter(a => a.type === 'JUSTIFICADA').length
      const countTotalAbsences = empAbsences.length

      // Dias de Férias/Afastamento na Janela
      let vacationDays = 0
      if (emp.status_start_date && emp.status_end_date) {
          const sDate = new Date(emp.status_start_date)
          const eDate = new Date(emp.status_end_date)
          
          // Intersecção com a janela
          const iStart = sDate > startWindow ? sDate : startWindow
          const iEnd = eDate < endWindow ? eDate : endWindow
          
          if (iStart <= iEnd) {
              vacationDays = getBusinessDaysBetween(iStart, iEnd)
          }
      }

      // Cálculo VA
      const effectiveDays = Math.max(0, BUSINESS_DAYS - countTotalAbsences - vacationDays)
      const vaCost = effectiveDays * DAILY_VA

      let basketCost = 0
      if (emp.salary <= BASKET_LIMIT && !['AVISO PREVIO TRABALHADO', 'MENOR APRENDIZ'].includes(emp.status)) {
           const discountableJustified = countJustified > 5 ? countJustified : 0
           let vacationDaysCorrido = 0
           if (emp.status_start_date && emp.status_end_date) {
              const sDate = new Date(emp.status_start_date)
              const eDate = new Date(emp.status_end_date)
              const iStart = sDate > startWindow ? sDate : startWindow
              const iEnd = eDate < endWindow ? eDate : endWindow
              if (iStart <= iEnd) {
                 const diffTime = Math.abs(iEnd.getTime() - iStart.getTime());
                 vacationDaysCorrido = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
              }
           }

           const daysToPay = Math.max(0, Math.min(30, 30 - vacationDaysCorrido - discountableJustified))
           const baseVal = (BASKET_VAL / 30) * daysToPay

           // Penalidade
           let penalty = 0
           if (countUnjustified === 1) penalty = 0.25
           else if (countUnjustified === 2) penalty = 0.50
           else if (countUnjustified >= 3) penalty = 1.00

           basketCost = baseVal * (1 - penalty)
      }

      const totalEmpCost = vaCost + basketCost
      stats.total_estimated += totalEmpCost

      // Agrupa por Departamento
      const dept = emp.department_id || 'SEM_DEPARTAMENTO'
      if (!deptMap[dept]) deptMap[dept] = { count: 0, cost: 0 }
      
      // Só soma contagem se estiver ativo (ou regra específica de visualização)
      if (emp.status === 'ATIVO') deptMap[dept].count++
      deptMap[dept].cost += totalEmpCost
  })

  // Ordena Departamentos
  const departmentCosts: DepartmentCost[] = Object.entries(deptMap)
      .map(([id, data]) => ({ department_id: id, active_count: data.count, total_cost: data.cost }))
      .sort((a, b) => b.total_cost - a.total_cost)


  // --- FORMATADORES E DADOS VISUAIS ---
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  const currentPeriodStr = today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const formattedPeriod = currentPeriodStr.charAt(0).toUpperCase() + currentPeriodStr.slice(1)

  const kpiCards = [
    { 
      label: 'Funcionários Ativos', 
      value: stats.active, 
      sub: 'Total na folha',
      icon: Users, 
      color: 'text-blue-600', 
      bg: 'bg-blue-100',
      href: '/employees' 
    },
    { 
      label: 'Estimativa Mensal', 
      value: formatCurrency(stats.total_estimated), 
      sub: 'Previsão de custo',
      icon: DollarSign, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-100',
      href: '/calculation' 
    },
    { 
      label: 'Período Atual', 
      value: formattedPeriod, 
      sub: 'Competência',
      icon: Calendar, 
      color: 'text-purple-600', 
      bg: 'bg-purple-100',
      href: null 
    }
  ]

  const absencesDisplay = [
    { label: 'Férias', value: stats.vacation, color: 'bg-teal-500' },
    { label: 'Afastado INSS', value: stats.inss, color: 'bg-slate-500' },
    { label: 'Licença Médica', value: stats.sick, color: 'bg-red-500' },
    { label: 'Licença Maternidade', value: stats.maternity, color: 'bg-pink-500' },
  ]

  const attrition = [
    { label: 'Desligados', value: stats.fired, icon: UserX, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Inativos', value: stats.inactive, icon: UserCheck, color: 'text-slate-500', bg: 'bg-slate-100' },
    { label: 'Aviso Prévio', value: stats.notice, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
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

      {/* KPI SECTION */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {kpiCards.map((card, idx) => {
          const CardContent = (
            <div className="flex justify-between items-start h-full">
              <div className="flex flex-col justify-between h-full">
                <div>
                    <p className="text-sm font-semibold text-slate-500 mb-1">{card.label}</p>
                    <h3 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">{card.value}</h3>
                    <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
                </div>
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
          const baseClasses = "bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-200 group h-full relative"
          
          return card.href ? (
              <Link href={card.href} key={idx} className="block h-full">
                <div className={`${baseClasses} hover:ring-2 hover:ring-blue-100 cursor-pointer`}>{CardContent}</div>
              </Link>
            ) : (
            <div key={idx} className={baseClasses}>{CardContent}</div>
          )
        })}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* CUSTOS POR SECRETARIA */}
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
                    const totalDisplayed = departmentCosts.reduce((acc, curr) => acc + curr.total_cost, 0) || 1
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
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000 ease-out group-hover:bg-blue-500 relative" style={{ width: `${percentOfTotal}%` }}></div>
                            </div>
                            <div className="flex justify-between mt-1">
                                <span className="text-[10px] text-slate-400 font-medium">{dept.active_count} funcionários</span>
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 rounded">{percentOfTotal.toFixed(1)}% do Total</span>
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
                    {absencesDisplay.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${item.color} shadow-sm`}></div>
                                <span className="text-sm font-medium text-slate-600">{item.label}</span>
                            </div>
                            <span className="font-bold text-slate-800">{item.value}</span>
                        </div>
                    ))}
                    {absencesDisplay.every(a => a.value === 0) && (
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