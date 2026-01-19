/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, FileSpreadsheet, Plus, X, Save, Search, Check, CalendarDays, ChevronLeft, ChevronRight, Calendar, User } from 'lucide-react'
import { parseAbsences } from '@/utils/excel-parser'
import { saveAbsencesBatch, deleteAbsence, getActiveEmployees } from '@/app/actions/absences'

export default function AbsencesClient({ initialAbsences }: { initialAbsences: any[] }) {
  const [loading, setLoading] = useState(false)
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7))

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // --- ESTADOS DO MODAL MANUAL ---
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [employeesList, setEmployeesList] = useState<any[]>([])
  
  // --- ESTADOS DO AUTOCOMPLETE ---
  const [searchTerm, setSearchTerm] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [manualForm, setManualForm] = useState({
    employeeId: '',
    startDate: '',
    endDate: '',
    reason: '',
    type: 'INJUSTIFICADA'
  })

  useEffect(() => {
    getActiveEmployees().then(setEmployeesList)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [monthFilter])

  // Lógicas de Upload e Salvar (Mantidas iguais)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    setLoading(true)
    try {
      const parsedData = await parseAbsences(e.target.files[0])
      if (parsedData.length === 0) {
        alert('Nenhuma falta válida encontrada.')
        setLoading(false)
        return
      }
      const result = await saveAbsencesBatch(parsedData)
      if (result.error) alert(result.error)
      else {
        alert(`${result.count} faltas importadas!`)
        window.location.reload()
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao processar arquivo.')
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualForm.employeeId) return alert("Selecione um funcionário.")
    if (!manualForm.startDate) return alert("Selecione a data inicial.")
    
    const finalDate = manualForm.endDate || manualForm.startDate
    if (finalDate < manualForm.startDate) return alert("A data final não pode ser menor que a inicial.")

    setLoading(true)
    const absencesToSave = []
    const current = new Date(manualForm.startDate + 'T12:00:00')
    const end = new Date(finalDate + 'T12:00:00')

    while (current <= end) {
        absencesToSave.push({
            employeeId: manualForm.employeeId,
            date: current.toISOString().split('T')[0],
            reason: manualForm.reason,
            type: manualForm.type
        })
        current.setDate(current.getDate() + 1)
    }

    const res = await saveAbsencesBatch(absencesToSave)
    setLoading(false)

    if (res.error) {
        alert(res.error)
    } else {
        const msg = absencesToSave.length > 1 ? `${absencesToSave.length} faltas lançadas!` : 'Falta lançada!'
        alert(msg)
        setIsModalOpen(false)
        setManualForm({ employeeId: '', startDate: '', endDate: '', reason: '', type: 'INJUSTIFICADA' })
        setSearchTerm('')
        window.location.reload()
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Remover esta falta?')) {
      await deleteAbsence(id)
      window.location.reload()
    }
  }

  // Filtros e Paginação
  const filteredEmployees = employeesList.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelectEmployee = (emp: any) => {
    setManualForm({ ...manualForm, employeeId: emp.id })
    setSearchTerm(emp.name)
    setIsDropdownOpen(false)
  }

  const filteredTable = initialAbsences.filter(a => a.date.startsWith(monthFilter))
  
  const totalItems = filteredTable.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = filteredTable.slice(startIndex, endIndex)

  return (
    <div className="space-y-4 md:space-y-6 flex flex-col h-[calc(100dvh-3rem)]">
      
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 shrink-0 px-2 md:px-0">
        <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="text-orange-600" /> Gestão de Faltas
            </h2>
            <p className="text-xs md:text-sm text-slate-500">Controle de ausências para a folha</p>
        </div>

        <div className="grid grid-cols-2 sm:flex flex-wrap gap-2 items-center">
            {/* Seletor de Mês */}
            <input 
                type="month" 
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="col-span-2 sm:col-span-1 border p-2 rounded-lg text-sm bg-white h-10 w-full sm:w-auto"
            />

            {/* Botões */}
            <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition shadow-sm h-10 text-sm font-bold"
            >
                <Plus size={18} />
                <span className="hidden sm:inline">Lançar Manual</span>
                <span className="sm:hidden">Lançar</span>
            </button>

            <label className={`flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition shadow-sm h-10 text-sm font-bold ${loading ? 'opacity-50' : ''}`}>
                <Upload size={18} />
                <span className="hidden sm:inline">{loading ? '...' : 'Importar Excel'}</span>
                <span className="sm:hidden">Importar</span>
                <input type="file" className="hidden" accept=".xlsx" onChange={handleFileUpload} disabled={loading} />
            </label>
        </div>
      </div>

      {/* ÁREA DE DADOS */}
      <div className="bg-slate-50 md:bg-white md:rounded-xl md:shadow-sm md:border md:border-slate-200 flex flex-col flex-1 min-h-0 overflow-hidden">
        
        <div className="hidden md:flex p-4 border-b border-slate-100 justify-between items-center bg-white shrink-0">
            <span className="font-semibold text-slate-700">Registros em {monthFilter}</span>
            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 font-bold">Total: {filteredTable.length}</span>
        </div>
        
        <div className="overflow-auto flex-1 relative p-2 md:p-0">
            
            {/* MOBILE: CARDS */}
            <div className="md:hidden space-y-3 pb-20">
                {currentData.length === 0 ? (
                    <div className="text-center p-8 text-slate-400 bg-white rounded-lg border border-dashed border-slate-300">
                        Nenhuma falta neste mês.
                    </div>
                ) : currentData.map((abs) => (
                    <div key={abs.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
                        <div className="flex justify-between items-start mb-3 border-b border-slate-50 pb-2">
                             <div className="flex items-center gap-2">
                                <div className="bg-slate-100 p-1.5 rounded-lg text-slate-500">
                                    <Calendar size={16}/>
                                </div>
                                <span className="font-bold text-slate-800 text-sm">
                                    {new Date(abs.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                </span>
                             </div>
                             <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                abs.type === 'INJUSTIFICADA' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                             }`}>
                                {abs.type}
                             </span>
                        </div>

                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm border border-slate-200">
                                <User size={18}/>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm leading-tight">{abs.employees?.name || '---'}</h3>
                                <p className="text-xs text-slate-500 font-mono">Mat: {abs.employee_id}</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-lg text-xs text-slate-600 mb-2 border border-slate-100">
                            <span className="font-bold">Motivo:</span> {abs.reason || 'Sem observação'}
                        </div>

                        <div className="flex justify-end pt-2">
                            <button 
                                onClick={() => handleDelete(abs.id)}
                                className="flex items-center gap-1 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition"
                            >
                                <Trash2 size={14}/> Remover
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* DESKTOP: TABELA */}
            <div className="hidden md:block">
                <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                    <tr>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Funcionário</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Motivo</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {currentData.length === 0 ? (
                        <tr><td colSpan={5} className="text-center p-8 text-slate-400">Nenhuma falta registrada neste mês.</td></tr>
                    ) : (
                        currentData.map((abs) => (
                        <tr key={abs.id} className="hover:bg-blue-50/30 transition">
                            <td className="px-6 py-3 font-medium text-slate-800">
                                {new Date(abs.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-3">
                                <div className="font-medium text-slate-900">{abs.employees?.name || '---'}</div>
                                <div className="text-xs text-slate-400">Mat: {abs.employee_id}</div>
                            </td>
                            <td className="px-6 py-3">
                                <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                                    abs.type === 'INJUSTIFICADA' 
                                        ? 'bg-red-50 text-red-700 border-red-100' 
                                        : 'bg-blue-50 text-blue-700 border-blue-100'
                                }`}>
                                    {abs.type}
                                </span>
                            </td>
                            <td className="px-6 py-3 text-slate-500">{abs.reason}</td>
                            <td className="px-6 py-3 text-right">
                            <button onClick={() => handleDelete(abs.id)} className="text-slate-400 hover:text-red-600 p-2 transition hover:bg-red-50 rounded-lg">
                                <Trash2 size={16} />
                            </button>
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

      {/* --- MODAL DE LANÇAMENTO (ATUALIZADO) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <CalendarDays size={18} className="text-blue-600"/> Lançar Falta / Período
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
                    
                    {/* AUTOCOMPLETE */}
                    <div ref={dropdownRef} className="relative">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Funcionário</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Digite nome ou matrícula..."
                                className="w-full border rounded-lg p-2 pl-3 pr-10 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value)
                                    setManualForm({...manualForm, employeeId: ''}) 
                                    setIsDropdownOpen(true)
                                }}
                                onFocus={() => setIsDropdownOpen(true)}
                                required
                            />
                            <div className="absolute right-3 top-2.5 text-slate-400 pointer-events-none">
                                {manualForm.employeeId ? <Check size={16} className="text-green-500"/> : <Search size={16}/>}
                            </div>
                        </div>

                        {isDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {filteredEmployees.length === 0 ? (
                                    <div className="p-3 text-sm text-slate-500 text-center">Nenhum funcionário encontrado</div>
                                ) : (
                                    filteredEmployees.map(emp => (
                                        <div 
                                            key={emp.id}
                                            onClick={() => handleSelectEmployee(emp)}
                                            className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
                                        >
                                            <div className="font-medium text-slate-800 text-sm">{emp.name}</div>
                                            <div className="text-xs text-slate-400">Matrícula: {emp.id}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* SELEÇÃO DE PERÍODO */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data Inicial</label>
                            <input 
                                type="date" 
                                required
                                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={manualForm.startDate}
                                onChange={e => setManualForm({...manualForm, startDate: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Data Final <span className="text-xs text-slate-400 font-normal">(Opcional)</span>
                            </label>
                            <input 
                                type="date" 
                                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                                value={manualForm.endDate}
                                onChange={e => setManualForm({...manualForm, endDate: e.target.value})}
                                min={manualForm.startDate}
                            />
                        </div>
                    </div>

                    {/* TIPO E MOTIVO */}
                    <div className="grid grid-cols-1 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo da Ausência</label>
                            <select 
                                className="w-full border rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={manualForm.type}
                                onChange={e => setManualForm({...manualForm, type: e.target.value})}
                            >
                                <option value="INJUSTIFICADA">Injustificada (Desc. Cesta)</option>
                                <option value="JUSTIFICADA">Atestado / Justificada</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Motivo / Observação</label>
                            <input 
                                type="text" 
                                placeholder="Ex: Atestado médico de 3 dias..."
                                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={manualForm.reason}
                                onChange={e => setManualForm({...manualForm, reason: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3 border-t border-slate-100 mt-2">
                        <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition text-sm font-medium"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="flex-1 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition text-sm font-medium flex justify-center items-center gap-2"
                        >
                            {loading ? 'Salvando...' : <><Save size={16}/> Salvar</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  )
}