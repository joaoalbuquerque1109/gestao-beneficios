/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { Plus, Trash2, DollarSign, Scale } from 'lucide-react'
import { createAdjustment, deleteAdjustment } from '@/app/actions/adjustments'

export default function AdjustmentsClient({ initialAdjustments }: any) {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    employeeId: '', type: 'CREDITO', value: '', reason: ''
  })

  // Filtra visualmente pelo mês selecionado
  const filtered = initialAdjustments.filter((a: any) => a.period_id === period)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createAdjustment({ ...formData, periodId: period })
    setIsModalOpen(false)
    setFormData({ employeeId: '', type: 'CREDITO', value: '', reason: '' })
    window.location.reload()
  }

  const handleDelete = async (id: string) => {
    if(confirm('Excluir ajuste?')) {
        await deleteAdjustment(id)
        window.location.reload()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Scale className="text-blue-600"/> Ajustes Financeiros
            </h2>
            <p className="text-slate-500 text-sm">Lançamentos manuais (Créditos/Débitos)</p>
        </div>
        <div className="flex gap-4">
            <input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="border p-2 rounded-lg"/>
            <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
                <Plus size={18}/> Novo Ajuste
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 border-b">
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
                    <tr key={adj.id}>
                        <td className="px-6 py-3">{adj.employee_id}</td>
                        <td className="px-6 py-3">{adj.employees?.name}</td>
                        <td className="px-6 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${adj.type === 'CREDITO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {adj.type}
                            </span>
                        </td>
                        <td className="px-6 py-3 font-medium">R$ {adj.value}</td>
                        <td className="px-6 py-3 text-slate-500">{adj.reason}</td>
                        <td className="px-6 py-3 text-right">
                            <button onClick={() => handleDelete(adj.id)} className="text-red-500 p-2 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-full max-w-md">
                <h3 className="font-bold text-lg mb-4">Adicionar Ajuste</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input required placeholder="Matrícula do Funcionário" className="w-full border p-2 rounded"
                        onChange={e => setFormData({...formData, employeeId: e.target.value})} />
                    
                    <select className="w-full border p-2 rounded" 
                        onChange={e => setFormData({...formData, type: e.target.value})}>
                        <option value="CREDITO">CRÉDITO (Pagar a mais)</option>
                        <option value="DEBITO">DÉBITO (Descontar)</option>
                    </select>

                    <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                        <input type="number" step="0.01" required placeholder="Valor" className="w-full border p-2 pl-8 rounded"
                            onChange={e => setFormData({...formData, value: e.target.value})} />
                    </div>

                    <input required placeholder="Motivo (Ex: Devolução Indevida)" className="w-full border p-2 rounded"
                        onChange={e => setFormData({...formData, reason: e.target.value})} />

                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  )
}