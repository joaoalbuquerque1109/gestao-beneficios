/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Calendar, Activity, ChevronLeft, ChevronRight, User, History, ArrowRight } from 'lucide-react'

export default function MovementsClient({ initialMovements }: { initialMovements: any[] }) {
  const [movements] = useState(initialMovements)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    setCurrentPage(1)
  }, [search, typeFilter])

  // Lógica de Filtragem Local
  const filtered = movements.filter(m => {
    const matchesSearch = 
      m.employee_name.toLowerCase().includes(search.toLowerCase()) || 
      m.employee_id.includes(search) ||
      (m.user_name && m.user_name.toLowerCase().includes(search.toLowerCase()))
    
    const matchesType = typeFilter ? m.type === typeFilter : true

    return matchesSearch && matchesType
  })

  // Dados Paginados
  const totalItems = filtered.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = filtered.slice(startIndex, endIndex)

  // Função para formatar data (PT-BR)
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    })
  }

  // Cores das badges por tipo
  const getBadgeColor = (type: string) => {
    if (type.includes('ADMISSAO')) return 'bg-green-100 text-green-700 border-green-200'
    if (type.includes('EXCLUSAO') || type.includes('DESLIGAMENTO')) return 'bg-red-100 text-red-700 border-red-200'
    if (type.includes('ALTERACAO')) return 'bg-blue-100 text-blue-700 border-blue-200'
    return 'bg-slate-100 text-slate-700 border-slate-200'
  }

  return (
    <div className="space-y-4 md:space-y-6 flex flex-col h-[calc(100dvh-3rem)]">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 shrink-0 px-2 md:px-0">
        <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="text-blue-600" /> Movimentações
            </h2>
            <p className="text-xs md:text-sm text-slate-500">Histórico de alterações cadastrais</p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3 justify-between items-center shrink-0">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome, matrícula ou usuário..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="w-full md:w-auto relative">
             <Filter className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" size={16} />
             <select 
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10 appearance-none"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
             >
               <option value="">Todos os Tipos</option>
               <option value="ADMISSAO">Admissão</option>
               <option value="EXCLUSAO">Exclusão</option>
               <option value="ALTERACAO_CARGO">Alteração de Cargo</option>
               <option value="ALTERACAO_SALARIO">Alteração de Salário</option>
             </select>
        </div>
      </div>

      {/* ÁREA DE DADOS (CARD MOBILE / TABELA DESKTOP) */}
      <div className="bg-slate-50 md:bg-white md:rounded-xl md:shadow-sm md:border md:border-slate-200 flex flex-col flex-1 min-h-0 overflow-hidden">
        
        <div className="hidden md:flex p-4 border-b border-slate-100 justify-between items-center bg-white shrink-0">
             <span className="font-semibold text-slate-700">Histórico Completo</span>
             <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 font-bold">
                 {totalItems} Registros
             </span>
        </div>

        <div className="overflow-auto flex-1 relative p-2 md:p-0">
            
            {/* MOBILE: CARDS */}
            <div className="md:hidden space-y-3 pb-20">
                {currentData.length === 0 ? (
                    <div className="text-center p-8 text-slate-400 bg-white rounded-lg border border-dashed border-slate-300">
                        Nenhuma movimentação encontrada.
                    </div>
                ) : currentData.map((mov) => (
                    <div key={mov.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
                        {/* Topo do Card */}
                        <div className="flex justify-between items-start mb-3 border-b border-slate-50 pb-2">
                             <div className="flex flex-col">
                                 <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                                     <Calendar size={10}/> {formatDate(mov.created_at)}
                                 </span>
                                 <span className={`mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit border ${getBadgeColor(mov.type)}`}>
                                     {mov.type.replace('_', ' ')}
                                 </span>
                             </div>
                             <div className="text-right">
                                 <div className="text-xs font-bold text-slate-700">{mov.user_name || 'Sistema'}</div>
                                 <div className="text-[10px] text-slate-400">Responsável</div>
                             </div>
                        </div>

                        {/* Corpo do Card */}
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm border border-slate-200">
                                <User size={18}/>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm leading-tight">{mov.employee_name}</h3>
                                <p className="text-xs text-slate-500 font-mono">Mat: {mov.employee_id}</p>
                            </div>
                        </div>

                        {/* Detalhes de Alteração */}
                        {(mov.old_value || mov.new_value) && (
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                                <div className="flex items-center gap-2 mb-1">
                                    <History size={12} className="text-slate-400"/>
                                    <span className="font-semibold text-slate-600">Alteração:</span>
                                </div>
                                <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center text-center">
                                    <span className="line-through text-red-400 bg-red-50 px-1 rounded truncate w-full block text-left">
                                        {mov.old_value || 'N/A'}
                                    </span>
                                    <ArrowRight size={12} className="text-slate-300"/>
                                    <span className="text-green-700 bg-green-50 px-1 rounded font-medium truncate w-full block text-right">
                                        {mov.new_value || 'N/A'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* DESKTOP: TABELA */}
            <div className="hidden md:block">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                        <tr>
                        <th className="px-6 py-4 whitespace-nowrap">Data / Hora</th>
                        <th className="px-6 py-4 whitespace-nowrap">Funcionário</th>
                        <th className="px-6 py-4 whitespace-nowrap">Tipo</th>
                        <th className="px-6 py-4 whitespace-nowrap">Detalhes (De {'->'} Para)</th>
                        <th className="px-6 py-4 whitespace-nowrap text-right">Responsável</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {currentData.length === 0 ? (
                        <tr><td colSpan={5} className="text-center p-8 text-slate-400">Nenhuma movimentação encontrada.</td></tr>
                        ) : (
                        currentData.map((mov) => (
                            <tr key={mov.id} className="hover:bg-blue-50/30 transition duration-150">
                                <td className="px-6 py-3 text-xs text-slate-500 font-mono">
                                    {formatDate(mov.created_at)}
                                </td>
                                <td className="px-6 py-3">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-slate-800">{mov.employee_name}</span>
                                        <span className="text-xs text-slate-400 font-mono">Mat: {mov.employee_id}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border tracking-wide ${getBadgeColor(mov.type)}`}>
                                        {mov.type.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-xs">
                                    {mov.old_value || mov.new_value ? (
                                        <div className="flex items-center gap-3">
                                        <span className="line-through text-red-400 decoration-red-300">{mov.old_value || '-'}</span>
                                        <ArrowRight size={12} className="text-slate-300"/>
                                        <span className="text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">{mov.new_value}</span>
                                        </div>
                                    ) : (
                                        <span className="text-slate-300">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <span className="text-xs font-medium text-slate-600">{mov.user_name || 'Sistema'}</span>
                                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                            {mov.user_name ? mov.user_name[0].toUpperCase() : 'S'}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Paginação */}
        {totalItems > 0 && (
            <div className="bg-white p-3 md:p-4 border-t border-slate-200 flex items-center justify-between shrink-0 sticky bottom-0 z-20 shadow-inner">
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
    </div>
  )
}