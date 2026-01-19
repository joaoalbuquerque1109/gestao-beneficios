/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, DollarSign, Scale, Save, Search, Check, X } from 'lucide-react'
import { createAdjustment, deleteAdjustment } from '@/app/actions/adjustments'
import { getActiveEmployees } from '@/app/actions/absences' // Reutilizando a busca de funcionários

export default function AdjustmentsClient({ initialAdjustments }: any) {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // --- AUTOCOMPLETE ESTADOS ---
  const [employeesList, setEmployeesList] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState({
    employeeId: '', type: 'CREDITO', value: '', reason: ''
  })

  // Carrega lista de funcionários apenas uma vez
  useEffect(() => {
    getActiveEmployees().then(setEmployeesList)
  }, [])

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Filtra visualmente pelo mês selecionado
  const filtered = initialAdjustments.filter((a: any) => a.period_id === period)

  // Filtra lista do autocomplete
  const filteredEmployees = employeesList.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelectEmployee = (emp: any) => {
    setFormData({ ...formData, employeeId: emp.id })
    setSearchTerm(emp.name)
    setIsDropdownOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if(!formData.employeeId) return alert("Selecione um funcionário.")
    
    setLoading(true)
    await createAdjustment({ ...formData, periodId: period })
    setLoading(false)
    
    setIsModalOpen(false)
    setFormData({ employeeId: '', type: 'CREDITO', value: '', reason: '' })
    setSearchTerm('')
    window.location.reload()
  }

  const handleDelete = async (id: string) => {
    if(confirm('Excluir ajuste?')) {
        await deleteAdjustment(id)
        window.location.reload()
    }
  }

  const formatCurrency = (val: number | string) => {
      const num = Number(val)
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
  }

  return (
    <div className="space-y-4 md:space-y-6 flex flex-col md:h-[calc(100vh-6rem)]">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 shrink-0">
        <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Scale className="text-blue-600"/> Ajustes Financeiros
            </h2>
            <p className="text-sm text-slate-500">Lançamentos manuais (Créditos/Débitos)</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <input 
                type="month" 
                value={period} 
                onChange={e => setPeriod(e.target.value)} 
                className="border p-2 rounded-lg bg-white flex-1 md:flex-none"
            />
            <button 
                onClick={() => setIsModalOpen(true)} 
                className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-800 shadow-sm font-bold text-sm flex-1 md:flex-none"
            >
                <Plus size={18}/> Novo
            </button>
        </div>
      </div>

      {/* ÁREA DE DADOS */}
      <div className="bg-slate-50 md:bg-white md:rounded-xl md:shadow-sm md:border md:border-slate-200 flex flex-col flex-1 min-h-0 md:overflow-hidden">
        
        {/* Header Tabela (Desktop) */}
        <div className="hidden md:flex p-4 border-b border-slate-100 justify-between items-center bg-white shrink-0">
            <span className="font-semibold text-slate-700">Lançamentos no Período</span>
            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 font-bold">
                {filtered.length} Registros
            </span>
        </div>

        <div className="md:overflow-auto flex-1 relative p-0 md:p-0">
            
            {/* --- MOBILE: CARDS --- */}
            <div className="md:hidden space-y-3 pb-20">
                {filtered.length === 0 ? (
                    <div className="text-center p-8 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                        Nenhum ajuste neste mês.
                    </div>
                ) : filtered.map((adj: any) => (
                    <div key={adj.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border ${
                                    adj.type === 'CREDITO' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
                                }`}>
                                    <DollarSign size={18}/>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm leading-tight">{adj.employees?.name || 'Desconhecido'}</h3>
                                    <p className="text-xs text-slate-500 font-mono">Mat: {adj.employee_id}</p>
                                </div>
                            </div>
                            <button onClick={() => handleDelete(adj.id)} className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50">
                                <Trash2 size={18}/>
                            </button>
                        </div>

                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 uppercase font-bold">Motivo</span>
                                <span className="text-xs font-medium text-slate-700">{adj.reason}</span>
                            </div>
                            <div className="text-right">
                                <span className={`text-lg font-bold ${adj.type === 'CREDITO' ? 'text-green-600' : 'text-red-600'}`}>
                                    {adj.type === 'DEBITO' ? '-' : '+'}{formatCurrency(adj.value)}
                                </span>
                                <span className="text-[10px] text-slate-400 uppercase block font-bold text-right">{adj.type}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- DESKTOP: TABELA --- */}
            <div className="hidden md:block">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-3">Matrícula</th>
                            <th className="px-6 py-3">Funcionário</th>
                            <th className="px-6 py-3">Tipo</th>
                            <th className="px-6 py-3">Valor</th>
                            <th className="px-6 py-3">Motivo</th>
                            <th className="px-6 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhum ajuste neste mês.</td></tr>
                        ) : filtered.map((adj: any) => (
                            <tr key={adj.id} className="hover:bg-slate-50 transition">
                                <td className="px-6 py-3 font-medium">{adj.employee_id}</td>
                                <td className="px-6 py-3 font-medium text-slate-800">{adj.employees?.name}</td>
                                <td className="px-6 py-3">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${
                                        adj.type === 'CREDITO' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                                    }`}>
                                        {adj.type}
                                    </span>
                                </td>
                                <td className={`px-6 py-3 font-mono font-bold ${adj.type === 'CREDITO' ? 'text-green-600' : 'text-red-600'}`}>
                                    {adj.type === 'DEBITO' ? '-' : '+'}{formatCurrency(adj.value)}
                                </td>
                                <td className="px-6 py-3 text-slate-500">{adj.reason}</td>
                                <td className="px-6 py-3 text-right">
                                    <button onClick={() => handleDelete(adj.id)} className="text-slate-400 p-2 hover:text-red-600 hover:bg-red-50 rounded transition">
                                        <Trash2 size={16}/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-slate-800">Novo Lançamento</h3>
                    <button onClick={() => setIsModalOpen(false)}><X className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* AUTOCOMPLETE FUNCIONÁRIO */}
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
                                    setFormData({...formData, employeeId: ''}) 
                                    setIsDropdownOpen(true)
                                }}
                                onFocus={() => setIsDropdownOpen(true)}
                                required
                            />
                            <div className="absolute right-3 top-2.5 text-slate-400 pointer-events-none">
                                {formData.employeeId ? <Check size={16} className="text-green-500"/> : <Search size={16}/>}
                            </div>
                        </div>

                        {isDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
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
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                            <select 
                                className="w-full border p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                                value={formData.type}
                                onChange={e => setFormData({...formData, type: e.target.value})}
                            >
                                <option value="CREDITO">CRÉDITO (+)</option>
                                <option value="DEBITO">DÉBITO (-)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                            <input 
                                type="number" step="0.01" required 
                                className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                value={formData.value}
                                onChange={e => setFormData({...formData, value: e.target.value})} 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Motivo</label>
                        <input 
                            required 
                            placeholder="Ex: Diferença de salário, Devolução..." 
                            className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            value={formData.reason}
                            onChange={e => setFormData({...formData, reason: e.target.value})} 
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-2">
                        <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)} 
                            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg text-sm transition"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 shadow-lg text-sm transition flex items-center gap-2"
                        >
                            {loading ? 'Salvando...' : <><Save size={16}/> Salvar Ajuste</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  )
}