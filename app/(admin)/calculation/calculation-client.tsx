/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { 
  Play, Calendar, DollarSign, Users, Loader2, Search, 
  ShoppingBasket, X, ChevronLeft, ChevronRight 
} from 'lucide-react'
import { processPeriod, getPeriodDataForExport, getCalculationDetails } from '@/app/actions/calculation' 
import { CalculationHeader } from './calculation-header' // <--- IMPORTANTE: Importar o componente novo
import * as XLSX from 'xlsx'

export default function CalculationClient({ periods, user, userRole }: any) { // <--- Recebendo userRole
  const [selectedPeriod, setSelectedPeriod] = useState(
    new Date().toISOString().slice(0, 7)
  )
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false) // Mantido para controlar loading do Excel
  
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

  useEffect(() => {
    const fetchDetails = async () => {
        const current = periods.find((p: any) => p.name === selectedPeriod)
        // Busca detalhes se estiver PROCESSADO, APROVADO ou FECHADO
        if (current && ['PROCESSADO', 'APPROVED', 'CLOSED'].includes(current.status)) {
            setLoadingDetails(true)
            const res = await getCalculationDetails(selectedPeriod)
            if (res.results) {
                setDetails(res.results)
                setPeriodWindow(res.window)
                if (res.basketLimit) setBasketLimit(res.basketLimit)
            }
            setLoadingDetails(false)
        } else {
            setDetails([])
            setPeriodWindow({ start: '', end: '' })
        }
    }
    fetchDetails()
  }, [selectedPeriod, periods])

  const handleProcess = async () => {
    const existing = periods.find((p: any) => p.name === selectedPeriod)
    
    // Alerta se já estiver processado/aprovado
    if (existing && existing.status !== 'OPEN' && existing.status !== null) {
        if (!confirm(`O período ${selectedPeriod} já possui status ${existing.status}. Deseja recalcular? Isso pode reabrir a competência.`)) return
    } else {
        if (!confirm(`Deseja iniciar o cálculo para a competência ${selectedPeriod}?`)) return
    }
    
    setLoading(true)
    const res = await processPeriod(selectedPeriod, user.email || 'Admin')
    
    if (res.error) {
        alert(res.error)
    } else {
        alert(`Cálculo concluído com sucesso!\n\nFuncionários Processados: ${res.count}\nValor Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(res.total || 0)}`)
        window.location.reload()
    }
    setLoading(false)
  }

  // Lógica de exportação (passada para o Header)
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
    const fileName = `Pedido_Valecard_${selectedPeriod}.xlsx`
    XLSX.writeFile(wb, fileName)
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

  const currentPeriodData = periods.find((p: any) => p.name === selectedPeriod)
  
  // --- LÓGICA DE FILTRAGEM ---
  const filteredDetails = details.filter((d: any) => {
    const matchesSearch = d.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          d.employee_id.includes(searchTerm)
    
    const matchesBasket = showBasketOnly 
        ? (d.employees?.salary <= basketLimit) 
        : true

    return matchesSearch && matchesBasket
  })

  // --- LÓGICA DE PAGINAÇÃO ---
  const totalItems = filteredDetails.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = filteredDetails.slice(startIndex, endIndex)
  const basketEligibleCount = details.filter((d:any) => d.employees?.salary <= basketLimit).length

  return (
    <div className="space-y-6">
      {/* 1. SELETOR DE PERÍODO (Topo) */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
            <h2 className="text-lg font-bold text-slate-700 uppercase tracking-wide">Painel de Controle</h2>
            <p className="text-slate-500 text-sm">Selecione o mês de referência</p>
        </div>
        
        <div className="flex items-center gap-3">
            <input 
                type="month"
                className="border p-2 rounded-lg font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
            />
            
            <button 
                onClick={handleProcess}
                disabled={loading}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg transition text-white shadow-sm ${
                    loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700'
                }`}
            >
                <Play size={18} />
                {loading ? 'Processando...' : 'Calcular / Recalcular'}
            </button>
        </div>
      </div>

      {currentPeriodData ? (
        <>
            {/* 2. HEADER DE APROVAÇÃO */}
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <CalculationHeader 
                        periodId={currentPeriodData.id}
                        periodStatus={currentPeriodData.status || 'OPEN'}
                        userRole={userRole}
                        onExport={handleExportValecard}
                        isExporting={exporting}
                    />
                </div>

            {/* 3. CARDS DE RESUMO (Simplificado: apenas 2 cards agora) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Users size={24}/></div>
                    <div>
                        <p className="text-sm text-slate-500">Funcionários Processados</p>
                        <p className="text-2xl font-bold text-slate-800">{currentPeriodData.total_employees}</p>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg"><DollarSign size={24}/></div>
                    <div>
                        <p className="text-sm text-slate-500">Valor Total da Folha</p>
                        <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(currentPeriodData.total_value)}
                        </p>
                    </div>
                </div>
                {/* Removemos o 3º card de Status pois o Header acima já faz isso melhor */}
            </div>

            {/* 4. TABELA DETALHADA (Só aparece se tiver dados processados) */}
            {['PROCESSADO', 'APPROVED', 'CLOSED'].includes(currentPeriodData.status) && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-4 mt-4">
                        <div>
                             <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Calendar className="text-blue-600" size={20}/>
                                Janela de Apuração: <span className="text-blue-600 font-mono">{periodWindow.start}</span> até <span className="text-blue-600 font-mono">{periodWindow.end}</span>
                             </h3>
                        </div>

                        {/* FILTROS DA TABELA */}
                        <div className="flex flex-col md:flex-row gap-3 items-center">
                             <button 
                                onClick={() => {
                                    setShowBasketOnly(!showBasketOnly)
                                    setCurrentPage(1)
                                }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                                    showBasketOnly 
                                    ? 'bg-orange-50 border-orange-300 text-orange-800 font-bold' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <ShoppingBasket size={16} className={showBasketOnly ? 'text-orange-600' : 'text-slate-400'} />
                                <span>Elegíveis Cesta ({basketEligibleCount})</span>
                                {showBasketOnly && <X size={14} className="ml-1 text-orange-400" />}
                            </button>

                             <div className="relative w-full md:w-auto">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Buscar funcionário..." 
                                    className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full md:w-64 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={searchTerm}
                                    onChange={e => {
                                        setSearchTerm(e.target.value)
                                        setCurrentPage(1)
                                    }}
                                />
                             </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {loadingDetails ? (
                            <div className="p-12 flex justify-center text-slate-500 items-center gap-2">
                                <Loader2 className="animate-spin" /> Carregando detalhes...
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-slate-600">
                                        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                            <tr>
                                                <th className="px-6 py-3">Matrícula</th>
                                                <th className="px-6 py-3">Nome</th>
                                                <th className="px-6 py-3 text-center">F. Injust.</th>
                                                <th className="px-6 py-3 text-center">Atestado/Férias</th>
                                                <th className="px-6 py-3">VA Final</th>
                                                <th className="px-6 py-3">Cesta Final</th>
                                                <th className="px-6 py-3">Regra (Cesta)</th>
                                                <th className="px-6 py-3">Ajustes</th>
                                                <th className="px-6 py-3 font-bold text-slate-800 text-right">Total a Pagar</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {currentData.length === 0 ? (
                                                <tr><td colSpan={9} className="p-8 text-center text-slate-400">
                                                    {showBasketOnly ? "Nenhum funcionário elegível encontrado." : "Nenhum resultado encontrado."}
                                                </td></tr>
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
                                                            {details.unjustifiedAbsences > 0 ? (
                                                                <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded">{details.unjustifiedAbsences}</span>
                                                            ) : '-'}
                                                        </td>
                                                        <td className="px-6 py-3 text-center text-slate-500">
                                                            {justified > 0 ? justified : '-'}
                                                        </td>
                                                        <td className="px-6 py-3 text-slate-700">
                                                            {formatCurrency(row.va_value)}
                                                        </td>
                                                        <td className="px-6 py-3 text-slate-700">
                                                            {formatCurrency(row.basket_value)}
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            {getBasketRule(details, row.employees?.salary, row.basket_value)}
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            {adjustments !== 0 ? (
                                                                <span className={adjustments > 0 ? 'text-green-600' : 'text-red-600'}>
                                                                    {formatCurrency(adjustments)}
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                        <td className="px-6 py-3 text-right font-bold text-slate-900 bg-slate-50/50">
                                                            {formatCurrency(row.total_receivable)}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                
                                {/* CONTROLE DE PAGINAÇÃO */}
                                {totalItems > 0 && (
                                    <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
                                        <span className="text-sm text-slate-500">
                                            Mostrando <b>{startIndex + 1}</b> a <b>{Math.min(endIndex, totalItems)}</b> de <b>{totalItems}</b> registros
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                                                disabled={currentPage === 1} 
                                                className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition"
                                            >
                                                <ChevronLeft size={16}/>
                                            </button>
                                            <span className="text-sm font-medium px-2">Página {currentPage} de {totalPages}</span>
                                            <button 
                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                                                disabled={currentPage === totalPages} 
                                                className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition"
                                            >
                                                <ChevronRight size={16}/>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
      ) : (
        <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
            <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-lg font-medium text-slate-900">Nenhum dado encontrado</h3>
            <p className="text-slate-500">Não há cálculo processado para a competência <span className="font-mono font-bold">{selectedPeriod}</span>.</p>
            <p className="text-sm text-slate-400 mt-1">Clique em "Calcular / Recalcular" acima para gerar a folha.</p>
        </div>
      )}
    </div>
  )
}