/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, FileSpreadsheet, Plus, X, Save, Search, Check, CalendarDays } from 'lucide-react'
import { parseAbsences } from '@/utils/excel-parser'
import { saveAbsencesBatch, deleteAbsence, getActiveEmployees } from '@/app/actions/absences'

export default function AbsencesClient({ initialAbsences }: { initialAbsences: any[] }) {
  const [loading, setLoading] = useState(false)
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7))

  // --- ESTADOS DO MODAL MANUAL ---
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [employeesList, setEmployeesList] = useState<any[]>([])
  
  // --- ESTADOS DO AUTOCOMPLETE (PESQUISA) ---
  const [searchTerm, setSearchTerm] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Form do Modal (Agora com startDate e endDate)
  const [manualForm, setManualForm] = useState({
    employeeId: '',
    startDate: '',
    endDate: '',
    reason: '',
    type: 'INJUSTIFICADA'
  })

  // Carrega lista de funcionários
  useEffect(() => {
    getActiveEmployees().then(setEmployeesList)
  }, [])

  // Fecha o dropdown se clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // 1. Upload Excel
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

  // 2. Salvar Manual (Agora suporta Múltiplos Dias)
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validações
    if (!manualForm.employeeId) return alert("Selecione um funcionário.")
    if (!manualForm.startDate) return alert("Selecione a data inicial.")
    
    // Se não tiver data final, assume que é o mesmo dia (1 dia de falta)
    const finalDate = manualForm.endDate || manualForm.startDate

    if (finalDate < manualForm.startDate) return alert("A data final não pode ser menor que a inicial.")

    setLoading(true)

    // --- LÓGICA DE GERAR INTERVALO DE DATAS ---
    const absencesToSave = []
    
    // Cria objetos Date para o loop (usando T12:00:00 para evitar problemas de fuso)
    const current = new Date(manualForm.startDate + 'T12:00:00')
    const end = new Date(finalDate + 'T12:00:00')

    // Loop: Enquanto data atual <= data final
    while (current <= end) {
        absencesToSave.push({
            employeeId: manualForm.employeeId,
            date: current.toISOString().split('T')[0], // YYYY-MM-DD
            reason: manualForm.reason,
            type: manualForm.type
        })
        // Avança 1 dia
        current.setDate(current.getDate() + 1)
    }

    // Reutilizamos a função de Batch (Lote) que já existe para o Excel
    const res = await saveAbsencesBatch(absencesToSave)
    
    setLoading(false)

    if (res.error) {
        alert(res.error)
    } else {
        const msg = absencesToSave.length > 1 
            ? `${absencesToSave.length} faltas lançadas com sucesso!`
            : 'Falta lançada com sucesso!'
            
        alert(msg)
        setIsModalOpen(false)
        // Resetar form
        setManualForm({ 
            employeeId: '', 
            startDate: '', 
            endDate: '', 
            reason: '', 
            type: 'INJUSTIFICADA' 
        })
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

  // Lógica de Filtro do Autocomplete
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

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="text-orange-600" /> Gestão de Faltas
            </h2>
            <p className="text-sm text-slate-500">Controle de ausências para a folha</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
            <input 
                type="month" 
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="border p-2 rounded-lg text-sm bg-white"
            />
            <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition shadow-sm"
            >
                <Plus size={18} />
                <span className="hidden md:inline">Lançar Manual</span>
            </button>
            <label className={`flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition shadow-sm ${loading ? 'opacity-50' : ''}`}>
                <Upload size={18} />
                <span className="hidden md:inline">{loading ? '...' : 'Importar Excel'}</span>
                <input type="file" className="hidden" accept=".xlsx" onChange={handleFileUpload} disabled={loading} />
            </label>
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <span className="font-semibold text-slate-700">Registros em {monthFilter}</span>
            <span className="text-xs bg-white border px-2 py-1 rounded text-slate-500">Total: {filteredTable.length}</span>
        </div>
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3">Data</th>
              <th className="px-6 py-3">Funcionário</th>
              <th className="px-6 py-3">Tipo</th>
              <th className="px-6 py-3">Motivo</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTable.length === 0 ? (
                <tr><td colSpan={5} className="text-center p-8 text-slate-400">Nenhuma falta registrada neste mês.</td></tr>
            ) : (
                filteredTable.map((abs) => (
                <tr key={abs.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-800">
                        {new Date(abs.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-3">
                        <div className="font-medium text-slate-900">{abs.employees?.name || '---'}</div>
                        <div className="text-xs text-slate-400">Mat: {abs.employee_id}</div>
                    </td>
                    <td className="px-6 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                            abs.type === 'INJUSTIFICADA' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                            {abs.type}
                        </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500">{abs.reason}</td>
                    <td className="px-6 py-3 text-right">
                    <button onClick={() => handleDelete(abs.id)} className="text-red-500 hover:text-red-700 p-2">
                        <Trash2 size={16} />
                    </button>
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- MODAL DE LANÇAMENTO (COM PERÍODO) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                                min={manualForm.startDate} // Bloqueia datas anteriores
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
                            {loading ? 'Salvando...' : <><Save size={16}/> Salvar Lançamento</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  )
}