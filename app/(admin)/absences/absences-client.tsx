/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState } from 'react'
import { Upload, Trash2, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { parseAbsences } from '@/utils/excel-parser'
import { saveAbsencesBatch, deleteAbsence } from '@/app/actions/absences'

export default function AbsencesClient({ initialAbsences }: { initialAbsences: any[] }) {
  const [loading, setLoading] = useState(false)
  const [absences] = useState(initialAbsences) // O Next.js atualiza isso via refresh
  
  // Filtro de mês simples para visualização
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7))

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    
    setLoading(true)
    try {
      const parsedData = await parseAbsences(e.target.files[0])
      
      if (parsedData.length === 0) {
        alert('Nenhuma falta válida encontrada na planilha.')
        setLoading(false)
        return
      }

      const result = await saveAbsencesBatch(parsedData)
      
      if (result.error) {
        alert(result.error)
      } else {
        alert(`${result.count} faltas importadas com sucesso!`)
        window.location.reload() // Recarrega para ver os dados novos
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao processar arquivo.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Remover esta falta?')) {
      await deleteAbsence(id)
      window.location.reload()
    }
  }

  // Filtra visualmente os dados carregados
  const filtered = initialAbsences.filter(a => a.date.startsWith(monthFilter))

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="text-orange-600" /> Gestão de Faltas
            </h2>
            <p className="text-sm text-slate-500">Importe as faltas para o cálculo mensal</p>
        </div>

        <div className="flex gap-4 items-center">
            {/* Seletor de Mês (apenas visual) */}
            <input 
                type="month" 
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="border p-2 rounded-lg text-sm"
            />

            <label className={`flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition ${loading ? 'opacity-50' : ''}`}>
                <Upload size={18} />
                <span>{loading ? 'Processando...' : 'Importar Excel'}</span>
                <input type="file" className="hidden" accept=".xlsx" onChange={handleFileUpload} disabled={loading} />
            </label>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <span className="font-semibold text-slate-700">Registros em {monthFilter}</span>
            <span className="text-xs bg-white border px-2 py-1 rounded text-slate-500">Total: {filtered.length}</span>
        </div>
        
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3">Data</th>
              <th className="px-6 py-3">Matrícula</th>
              <th className="px-6 py-3">Funcionário</th>
              <th className="px-6 py-3">Motivo</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center p-8 text-slate-400">Nenhuma falta registrada neste mês.</td></tr>
            ) : (
                filtered.map((abs) => (
                <tr key={abs.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-800">
                        {new Date(abs.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-3">{abs.employee_id}</td>
                    {/* O Supabase traz o objeto employee_id joinado se configurarmos, mas por enquanto vamos simples */}
                    <td className="px-6 py-3">{abs.employees?.name || 'Não encontrado'}</td>
                    <td className="px-6 py-3">{abs.reason}</td>
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
    </div>
  )
}