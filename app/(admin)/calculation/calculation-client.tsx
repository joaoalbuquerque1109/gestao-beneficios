/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { 
  Play, Calendar, DollarSign, Users, Loader2, Search, 
  ShoppingBasket, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Lock
} from 'lucide-react'
import { processPeriod, getPeriodDataForExport, getCalculationDetails } from '@/app/actions/calculation' 
import { CalculationHeader } from './calculation-header' 
import * as XLSX from 'xlsx'

export default function CalculationClient({ periods = [], user, userRole }: any) { 
  const currentMonth = new Date().toISOString().slice(0, 7)
  const initialPeriod = periods.find((p: any) => p.name === currentMonth) 
      ? currentMonth 
      : (periods[0]?.name || currentMonth)

  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriod)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  
  const currentPeriodData = periods.find((p: any) => p.name === selectedPeriod)

  // --- ESTADOS DA TABELA ---
  const [details, setDetails] = useState<any[]>([])
  const [periodWindow, setPeriodWindow] = useState({ start: '', end: '' })
  const [basketLimit, setBasketLimit] = useState(1780)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // --- PAGINAÇÃO E FILTROS ---
  const [currentPage, setCurrentPage] = useState(1)
  const [showBasketOnly, setShowBasketOnly] = useState(false)
  const itemsPerPage = 20

  // --- MOBILE ---
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null)

  // --- LÓGICA DE BLOQUEIO ROBUSTA ---
  // Normaliza o status para garantir que pega variações (Ex: 'Closed', 'CLOSED', 'Fechado')
  const statusRaw = currentPeriodData?.status?.toUpperCase() || 'OPEN'
  const isPeriodLocked = ['APPROVED', 'APROVADO', 'CLOSED', 'FECHADO', 'EXPORTED', 'EXPORTADO', 'SELADO'].includes(statusRaw)

  // Cores do Status para feedback visual
  const getStatusColor = () => {
      if (isPeriodLocked) return 'bg-red-100 text-red-700 border-red-200'
      if (statusRaw === 'PROCESSADO') return 'bg-blue-100 text-blue-700 border-blue-200'
      return 'bg-slate-100 text-slate-600 border-slate-200'
  }

  useEffect(() => {
    const fetchDetails = async () => {
        // Se tiver status válido (mesmo bloqueado, queremos ver os dados), busca detalhes
        if (currentPeriodData && statusRaw !== 'OPEN') {
            setLoadingDetails(true)
            try {
                const res = await getCalculationDetails(selectedPeriod)
                if (res.results) {
                    setDetails(res.results)
                    setPeriodWindow(res.window)
                    if (res.basketLimit) setBasketLimit(res.basketLimit)
                }
            } catch (error) {
                console.error("Erro ao buscar detalhes:", error)
            } finally {
                setLoadingDetails(false)
            }
        } else {
            setDetails([])
            setPeriodWindow({ start: '', end: '' })
        }
    }
    fetchDetails()
  }, [selectedPeriod, currentPeriodData, statusRaw]) 

  const handleProcess = async () => {
    // TRAVA DE SEGURANÇA 1: Verificação lógica antes de executar
    if (isPeriodLocked) {
        alert(`SEGURANÇA: Este período está com status "${statusRaw}".\n\nNão é possível recalcular um período fechado ou aprovado para garantir a integridade dos dados.\n\nSe necessário, solicite a reabertura no painel de administração.`)
        return
    }

    const existing = currentPeriodData
    
    if (existing && existing.status !== 'OPEN') {
        if (!confirm(`ATENÇÃO: O período ${selectedPeriod} já foi processado anteriormente.\n\nRecalcular irá SOBRESCREVER os valores atuais.\nDeseja continuar?`)) return
    } else {
        if (!confirm(`Deseja iniciar o cálculo para a competência ${selectedPeriod}?`)) return
    }
    
    setLoading(true)
    const res = await processPeriod(selectedPeriod, user.email || 'Admin')
    
    if (res.error) {
        alert(res.error)
    } else {
        alert(`Cálculo concluído!\nFuncionários: ${res.count}\nValor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(res.total || 0)}`)
        window.location.reload()
    }
    setLoading(false)
  }

  const handleExportValecard = async () => {
    if (!currentPeriodData) return

    setExporting(true)
    const { data, error } = await getPeriodDataForExport(selectedPeriod)
    
    if (error || !data || data.length === 0) {
        alert('Erro ao buscar dados ou folha vazia.')
        setExporting(false)
        return
    }

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }

    const dataToExport = data.map((r: any) => {
        const emp = r.employees || {}
        return {
            'Matrícula': r.employee_id,
            'Referência': emp.department_id || 'GERAL',
            'Nome': r.employee_name,
            'Dt. Nascimento': formatDate(emp.birth_date),
            'CPF': emp.cpf ? emp.cpf.replace(/\D/g, '') : '', 
            'Valor': r.total_receivable
        }
    })

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Pedido")
    XLSX.writeFile(wb, `Pedido_Valecard_${selectedPeriod}.xlsx`)
    setExporting(false)
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  
  const getBasketRule = (details: any, salary: number, basketValue: number) => {
      const unjust = details?.unjustifiedAbsences || 0
      if (basketValue === 0) {
          if (unjust >= 3) return <span className="text-xs font-bold text-red-600">Cortado (3+ Faltas)</span>
          return <span className="text-xs text-slate-400">Salário &gt; Teto</span>
      }
      if (unjust === 0) return <span className="text-xs font-bold text-green-600">Integral</span>
      if (unjust === 1) return <span className="text-xs font-bold text-orange-600">Desc. 25%</span>
      if (unjust === 2) return <span className="text-xs font-bold text-orange-700">Desc. 50%</span>
      return <span className="text-xs">-</span>
  }
  
  const filteredDetails = details.filter((d: any) => {
    const matchesSearch = d.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          d.employee_id.includes(searchTerm)
    
    const matchesBasket = showBasketOnly 
        ? (d.employees?.salary <= basketLimit) 
        : true

    return matchesSearch && matchesBasket
  })

  const totalItems = filteredDetails.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = filteredDetails.slice(startIndex, endIndex)
  
  const basketEligibleCount = details.filter((d:any) => d.employees?.salary <= basketLimit).length

  return (
    <div className="space-y-6 pb-20">
      
      {/* 1. SELETOR DE PERÍODO */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200 shrink-0">
        <div className="w-full md:w-auto text-center md:text-left">
            <h2 className="text-lg font-bold text-slate-700 uppercase tracking-wide">Painel de Controle</h2>
            <div className="flex items-center gap-2 mt-1 justify-center md:justify-start">
                <p className="text-slate-500 text-sm">Mês de Referência:</p>
                {/* Feedback Visual do Status */}
                {currentPeriodData && (
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getStatusColor()}`}>
                        {statusRaw}
                    </span>
                )}
            </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <input 
                type="month"
                className="w-full sm:w-auto border p-2 rounded-lg font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-center h-10"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
            />
            
            {/* TRAVA DE SEGURANÇA 2: Botão Desabilitado na Interface */}
            {isPeriodLocked ? (
                <button 
                    disabled
                    className="w-full sm:w-auto flex justify-center items-center gap-2 px-6 py-2 rounded-lg bg-slate-100 text-slate-400 font-bold text-sm cursor-not-allowed border border-slate-200 h-10"
                    title={`Período ${statusRaw}. Reabra para permitir recálculo.`}
                >
                    <Lock size={16} />
                    Bloqueado
                </button>
            ) : (
                <button 
                    onClick={handleProcess}
                    disabled={loading}
                    className={`w-full sm:w-auto flex justify-center items-center gap-2 px-6 py-2 rounded-lg transition text-white shadow-sm font-bold text-sm h-10 ${
                        loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'
                    }`}
                >
                    {loading ? <Loader2 size={18} className="animate-spin"/> : <Play size={18} />}
                    {loading ? 'Calculando...' : 'Calcular'}
                </button>
            )}
        </div>
      </div>

      {currentPeriodData ? (
        <>
            {/* 2. HEADER E RESUMO */}
            <div className="shrink-0 space-y-4">
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <CalculationHeader 
                        periodId={currentPeriodData.id}
                        periodStatus={statusRaw} // Passa o status normalizado
                        userRole={userRole}
                        onExport={handleExportValecard}
                        isExporting={exporting}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-6">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-3 text-center md:text-left">
                        <div className="p-2 md:p-3 bg-blue-50 text-blue-600 rounded-lg"><Users size={20} className="md:w-6 md:h-6"/></div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Processados</p>
                            <p className="text-xl md:text-2xl font-bold text-slate-800">{currentPeriodData.total_employees}</p>
                        </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-3 text-center md:text-left">
                        <div className="p-2 md:p-3 bg-green-50 text-green-600 rounded-lg"><DollarSign size={20} className="md:w-6 md:h-6"/></div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Total Folha</p>
                            <p className="text-xl md:text-2xl font-bold text-green-600">
                                {formatCurrency(currentPeriodData.total_value)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. CONTEÚDO PRINCIPAL (Tabela/Lista) */}
            {['PROCESSADO', 'APPROVED', 'APROVADO', 'CLOSED', 'FECHADO', 'EXPORTED', 'EXPORTADO', 'SELADO'].includes(statusRaw) && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   
                   {/* BARRA DE FILTROS */}
                   <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3 justify-between items-center sticky top-0 z-10 md:static">
                        <div className="flex items-center gap-2 text-sm text-slate-600 w-full md:w-auto justify-center md:justify-start">
                             <Calendar size={16} className="text-blue-600"/>
                             <span className="hidden sm:inline">Apuração:</span> 
                             <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs md:text-sm">{periodWindow.start} a {periodWindow.end}</span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                             <button 
                                onClick={() => { setShowBasketOnly(!showBasketOnly); setCurrentPage(1); }}
                                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition w-full sm:w-auto ${showBasketOnly ? 'bg-orange-50 border-orange-300 text-orange-800 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                                <ShoppingBasket size={16} className={showBasketOnly ? 'text-orange-600' : 'text-slate-400'} />
                                <span>Cesta ({basketEligibleCount})</span>
                                {showBasketOnly && <X size={14} className="ml-1 text-orange-400" />}
                            </button>

                             <div className="relative w-full sm:w-auto">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Buscar..." 
                                    className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full sm:w-64 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={searchTerm}
                                    onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                />
                             </div>
                        </div>
                    </div>

                    {/* CONTAINER DE DADOS */}
                    <div className="md:bg-white md:rounded-xl md:shadow-sm md:border md:border-slate-200 overflow-hidden">
                        
                        {loadingDetails ? (
                            <div className="p-12 flex flex-col justify-center items-center text-slate-500 gap-3">
                                <Loader2 className="animate-spin h-10 w-10 text-blue-500" /> 
                                <p>Carregando dados da folha...</p>
                            </div>
                        ) : (
                            <div>
                                {/* --- MOBILE: CARDS --- */}
                                <div className="md:hidden space-y-3">
                                    {currentData.length === 0 ? (
                                        <div className="text-center p-8 text-slate-400">Nenhum registro encontrado.</div>
                                    ) : currentData.map((row: any) => {
                                        const details = row.calculation_details || {}
                                        const isExpanded = expandedCardId === row.id
                                        const adjustments = details.adjustmentsTotal || 0

                                        return (
                                            <div key={row.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200">
                                                <div 
                                                    onClick={() => setExpandedCardId(isExpanded ? null : row.id)}
                                                    className="p-4 flex justify-between items-center cursor-pointer active:bg-slate-50"
                                                >
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm">{row.employee_name}</div>
                                                        <div className="text-xs text-slate-500">Mat: {row.employee_id}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-slate-900">{formatCurrency(row.total_receivable)}</div>
                                                        <div className="text-[10px] text-green-600 font-bold uppercase">A Pagar</div>
                                                    </div>
                                                    <div className="ml-2 text-slate-400">
                                                        {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className="bg-slate-50 p-4 border-t border-slate-100 text-xs space-y-3">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <span className="text-slate-400 uppercase block text-[10px]">Faltas Injust.</span>
                                                                <span className={`font-bold ${details.unjustifiedAbsences > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                                                                    {details.unjustifiedAbsences || 0}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-400 uppercase block text-[10px]">Atestados</span>
                                                                <span className="font-bold text-slate-700">
                                                                    {(details.totalAbsences || 0) - (details.unjustifiedAbsences || 0)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1 pt-2 border-t border-slate-200">
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500">Valor VA:</span>
                                                                <span className="font-medium">{formatCurrency(row.va_value)}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500">Valor Cesta:</span>
                                                                <span className="font-medium">{formatCurrency(row.basket_value)}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500">Ajustes:</span>
                                                                <span className={`font-medium ${adjustments !== 0 ? (adjustments > 0 ? 'text-green-600' : 'text-red-600') : ''}`}>
                                                                    {formatCurrency(adjustments)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="pt-2">
                                                            <div className="text-[10px] text-slate-400 uppercase">Regra Aplicada (Cesta)</div>
                                                            <div className="bg-white border p-2 rounded mt-1">
                                                                {getBasketRule(details, row.employees?.salary, row.basket_value)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* --- DESKTOP: TABELA COMPLETA --- */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-left text-sm text-slate-600">
                                        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Matrícula</th>
                                                <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Nome</th>
                                                <th className="px-6 py-4 text-center whitespace-nowrap bg-slate-50">F. Injust.</th>
                                                <th className="px-6 py-4 text-center whitespace-nowrap bg-slate-50">Atestado/Férias</th>
                                                <th className="px-6 py-4 whitespace-nowrap bg-slate-50">VA Final</th>
                                                <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Cesta Final</th>
                                                <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Regra (Cesta)</th>
                                                <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Ajustes</th>
                                                <th className="px-6 py-4 font-bold text-slate-800 text-right whitespace-nowrap bg-slate-50">Total a Pagar</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {currentData.length === 0 ? (
                                                <tr><td colSpan={9} className="p-8 text-center text-slate-400">Nenhum resultado encontrado.</td></tr>
                                            ) : currentData.map((row: any) => {
                                                const details = row.calculation_details || {}
                                                const justified = (details.totalAbsences || 0) - (details.unjustifiedAbsences || 0)
                                                const adjustments = details.adjustmentsTotal || 0
                                                return (
                                                    <tr key={row.id} className="hover:bg-slate-50 transition">
                                                        <td className="px-6 py-3 font-medium">{row.employee_id}</td>
                                                        <td className="px-6 py-3 font-medium text-slate-800">
                                                            {row.employee_name}
                                                            <div className="text-xs text-slate-400 font-normal">{row.employee_role}</div>
                                                        </td>
                                                        <td className="px-6 py-3 text-center">
                                                            {details.unjustifiedAbsences > 0 ? ( <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded">{details.unjustifiedAbsences}</span> ) : '-'}
                                                        </td>
                                                        <td className="px-6 py-3 text-center text-slate-500">{justified > 0 ? justified : '-'}</td>
                                                        <td className="px-6 py-3 text-slate-700">{formatCurrency(row.va_value)}</td>
                                                        <td className="px-6 py-3 text-slate-700">{formatCurrency(row.basket_value)}</td>
                                                        <td className="px-6 py-3">{getBasketRule(details, row.employees?.salary, row.basket_value)}</td>
                                                        <td className="px-6 py-3">
                                                            {adjustments !== 0 ? ( <span className={adjustments > 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(adjustments)}</span> ) : '-'}
                                                        </td>
                                                        <td className="px-6 py-3 text-right font-bold text-slate-900 bg-slate-50/50">{formatCurrency(row.total_receivable)}</td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RODAPÉ PAGINAÇÃO (Fixo no rodapé do card) */}
                    {totalItems > 0 && (
                        <div className="bg-white p-3 md:p-4 border-t border-slate-200 flex items-center justify-between shrink-0 rounded-b-xl shadow-inner z-20">
                            <span className="text-xs md:text-sm text-slate-500">
                                <span className="hidden sm:inline">Mostrando</span> <b>{startIndex + 1}-{Math.min(endIndex, totalItems)}</b> <span className="hidden sm:inline">de <b>{totalItems}</b></span>
                            </span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 transition">
                                    <ChevronLeft size={16}/>
                                </button>
                                <span className="text-sm font-medium px-2 text-slate-700">{currentPage}/{totalPages}</span>
                                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 transition">
                                    <ChevronRight size={16}/>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-slate-50 border border-dashed border-slate-300 rounded-xl m-2">
            <Calendar className="h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-lg font-medium text-slate-900 text-center">Nenhum dado encontrado</h3>
            <p className="text-slate-500 text-center px-4">Não há cálculo processado para a competência <span className="font-mono font-bold">{selectedPeriod}</span>.</p>
            <p className="text-sm text-slate-400 mt-2">Clique em "Calcular" acima para gerar a folha.</p>
        </div>
      )}
    </div>
  )
}