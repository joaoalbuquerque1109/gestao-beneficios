/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState } from 'react'
import { Search, Filter, Calendar, Activity, ChevronLeft, ChevronRight } from 'lucide-react'

const ITEMS_PER_PAGE = 10

export default function MovementsClient({ initialMovements }: { initialMovements: any[] }) {
  const [movements] = useState(initialMovements)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Lógica de Filtragem Local
  const filtered = movements.filter(m => {
    const matchesSearch = 
      m.employee_name.toLowerCase().includes(search.toLowerCase()) || 
      m.employee_id.includes(search) ||
      (m.user_name && m.user_name.toLowerCase().includes(search.toLowerCase()))
    
    const matchesType = typeFilter ? m.type === typeFilter : true

    return matchesSearch && matchesType
  })

  // Cálculo de paginação
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedData = filtered.slice(startIndex, endIndex)

  // Resetar página quando filtrar
  const handleFilterChange = (setter: any, value: any) => {
    setter(value)
    setCurrentPage(1)
  }

  // Função para formatar data (PT-BR)
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('pt-BR')
  }

  // Cores das badges por tipo
  const getBadgeColor = (type: string) => {
    if (type.includes('ADMISSAO')) return 'bg-green-100 text-green-800'
    if (type.includes('EXCLUSAO') || type.includes('DESLIGAMENTO')) return 'bg-red-100 text-red-800'
    if (type.includes('ALTERACAO')) return 'bg-blue-100 text-blue-800'
    return 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Activity className="text-blue-600" />
          Movimentações
        </h2>
        <p className="text-sm text-slate-500">Histórico de alterações cadastrais</p>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome, matrícula ou usuário..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => handleFilterChange(setSearch, e.target.value)}
          />
        </div>
        
        <div className="flex gap-4">
          <div className="relative">
             <Filter className="absolute left-3 top-2.5 text-slate-400" size={16} />
             <select 
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10"
                value={typeFilter}
                onChange={(e) => handleFilterChange(setTypeFilter, e.target.value)}
             >
               <option value="">Todos os Tipos</option>
               <option value="ADMISSAO">Admissão</option>
               <option value="EXCLUSAO">Exclusão</option>
               <option value="ALTERACAO_CARGO">Alteração de Cargo</option>
               <option value="ALTERACAO_SALARIO">Alteração de Salário</option>
             </select>
          </div>
        </div>
      </div>

      {/* Container com altura fixa para tabela + paginação */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col" style={{ height: '600px' }}>
        {/* Tabela com overflow */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-6 py-4">Data / Hora</th>
                <th className="px-6 py-4">Matrícula</th>
                <th className="px-6 py-4">Funcionário</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Detalhes</th>
                <th className="px-6 py-4">Usuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr><td colSpan={6} className="text-center p-8 text-slate-400">Nenhuma movimentação encontrada.</td></tr>
              ) : (
                paginatedData.map((mov) => (
                  <tr key={mov.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-xs text-slate-500">
                      {formatDate(mov.created_at)}
                    </td>
                    <td className="px-6 py-3 font-medium">{mov.employee_id}</td>
                    <td className="px-6 py-3">{mov.employee_name}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getBadgeColor(mov.type)}`}>
                        {mov.type}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs">
                       {mov.old_value || mov.new_value ? (
                         <div className="flex flex-col">
                           {mov.old_value && <span className="line-through text-red-400">{mov.old_value}</span>}
                           {mov.new_value && <span className="text-green-600 font-medium">{mov.new_value}</span>}
                         </div>
                       ) : '-'}
                    </td>
                    <td className="px-6 py-3 text-slate-500">{mov.user_name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação sempre no final */}
        <div className="border-t border-slate-200 bg-slate-50 p-4 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-slate-600">
            Exibindo <span className="font-semibold">{filtered.length === 0 ? 0 : startIndex + 1}</span> a <span className="font-semibold">{Math.min(endIndex, filtered.length)}</span> de <span className="font-semibold">{filtered.length}</span> registros
          </div>
          
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
              aria-label="Página anterior"
            >
              <ChevronLeft size={18} />
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
              aria-label="Próxima página"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}