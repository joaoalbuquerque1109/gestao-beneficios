/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState } from 'react'
import { Upload, Trash2, FileSpreadsheet, AlertCircle, Plus, CheckCircle2, AlertCircle as AlertIcon } from 'lucide-react'
import { parseAbsences } from '@/utils/excel-parser'
import { saveAbsencesBatch, deleteAbsence } from '@/app/actions/absences'
import { createClient } from '@/utils/supabase/client'

export default function AbsencesClient({ initialAbsences }: { initialAbsences: any[] }) {
  const [loading, setLoading] = useState(false)
  const [absences] = useState(initialAbsences) // O Next.js atualiza isso via refresh
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7))
  const [openManualForm, setOpenManualForm] = useState(false)
  const [manualData, setManualData] = useState({ date: '', employee_id: '', reason: '', type: 'INJUSTIFICADA' })
  const [employeeExists, setEmployeeExists] = useState<boolean | null>(null)
  const [checkingEmployee, setCheckingEmployee] = useState(false)

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

  const handleManualSubmit = async () => {
    if (!manualData.date || !manualData.employee_id || !manualData.reason) {
      alert('Preencha todos os campos obrigatórios.')
      return
    }

    if (employeeExists === false) {
      alert('Funcionário não encontrado na base de dados.')
      return
    }

    setLoading(true)
    try {
      const result = await saveAbsencesBatch([
        {
          date: manualData.date,
          employee_id: manualData.employee_id,
          reason: manualData.reason,
          type: manualData.type,
        }
      ])

      if (result.error) {
        alert(result.error)
      } else {
        alert('Falta adicionada com sucesso!')
        setOpenManualForm(false)
        setManualData({ date: '', employee_id: '', reason: '', type: '' })
        setEmployeeExists(null)
        window.location.reload()
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao adicionar falta.')
    } finally {
      setLoading(false)
    }
  }

  const handleEmployeeIdChange = async (value: string) => {
    setManualData({ ...manualData, employee_id: value })
    
    if (!value.trim()) {
      setEmployeeExists(null)
      return
    }

    setCheckingEmployee(true)
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('employees')
        .select('id')
        .eq('id', value)
        .maybeSingle()

      if (error) {
        console.error('Erro na query:', error)
        setEmployeeExists(false)
      } else if (data) {
        setEmployeeExists(true)
      } else {
        setEmployeeExists(false)
      }
    } catch (err) {
      console.error('Erro ao verificar funcionário:', err)
      setEmployeeExists(false)
    } finally {
      setCheckingEmployee(false)
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

            <button
              onClick={() => setOpenManualForm(true)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              <Plus size={18} />
              <span>Adicionar Falta</span>
            </button>

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
      {/* Modal para adicionar falta manualmente */}
      {openManualForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Adicionar Falta Manualmente</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Data da Falta
                </label>
                <input
                  type="date"
                  value={manualData.date}
                  onChange={(e) => setManualData({ ...manualData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Matrícula do Funcionário
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={manualData.employee_id}
                    onChange={(e) => handleEmployeeIdChange(e.target.value)}
                    placeholder="Ex: 001, 002..."
                    className={`w-full px-3 py-2 pr-10 border rounded-lg outline-none focus:ring-2 focus:ring-green-500 ${
                      employeeExists === true
                        ? 'border-green-500'
                        : employeeExists === false
                        ? 'border-red-500'
                        : 'border-slate-200'
                    }`}
                    required
                  />
                  {checkingEmployee && (
                    <div className="absolute right-3 top-2.5">
                      <div className="w-5 h-5 border-2 border-slate-300 border-t-green-500 rounded-full animate-spin"></div>
                    </div>
                  )}
                  {!checkingEmployee && employeeExists === true && (
                    <CheckCircle2 size={20} className="absolute right-3 top-2.5 text-green-500" />
                  )}
                  {!checkingEmployee && employeeExists === false && (
                    <AlertIcon size={20} className="absolute right-3 top-2.5 text-red-500" />
                  )}
                </div>
                {employeeExists === false && (
                  <p className="text-xs text-red-500 mt-1">Funcionário não encontrado</p>
                )}
                {employeeExists === true && (
                  <p className="text-xs text-green-600 mt-1">Funcionário encontrado</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tipo de Falta
                </label>
                <select
                  value={manualData.type}
                  onChange={(e) => setManualData({ ...manualData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="INJUSTIFICADA">Injustificada</option>
                  <option value="JUSTIFICADA">Justificada</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Motivo
                </label>
                <textarea
                  value={manualData.reason}
                  onChange={(e) => setManualData({ ...manualData, reason: e.target.value })}
                  placeholder="Descreva o motivo da falta..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  rows={3}
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setOpenManualForm(false)
                  setManualData({ date: '', employee_id: '', reason: '', type: 'INJUSTIFICADA' })
                  setEmployeeExists(null)
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleManualSubmit}
                disabled={loading || employeeExists === false}
                className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}    </div>
  )
}