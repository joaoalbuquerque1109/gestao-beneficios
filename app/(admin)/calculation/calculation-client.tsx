/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { Play, Calendar, DollarSign, Users } from 'lucide-react'
import { processPeriod } from '@/app/actions/calculation'

export default function CalculationClient({ periods, user }: any) {
  const [selectedPeriod, setSelectedPeriod] = useState(
    new Date().toISOString().slice(0, 7) // Mês atual Ex: "2026-01"
  )
  const [loading, setLoading] = useState(false)

  const handleProcess = async () => {
    // Busca se já existe dados para avisar o usuário corretamente
    const existing = periods.find((p: any) => p.name === selectedPeriod)
    
    if (existing && existing.status === 'PROCESSADO') {
        if (!confirm(`O período ${selectedPeriod} já foi processado anteriormente. Deseja recalcular?`)) return
    } else {
        if (!confirm(`Deseja iniciar o cálculo para a competência ${selectedPeriod}?`)) return
    }
    
    setLoading(true)
    const res = await processPeriod(selectedPeriod, user.email || 'Admin')
    setLoading(false)

    if (res.error) {
        alert(res.error)
    } else {
        alert(`Cálculo concluído com sucesso!\n\nFuncionários Processados: ${res.count}\nValor Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(res.total || 0)}`)
        window.location.reload() // Recarrega para buscar os dados novos do banco
    }
  }

  // --- CORREÇÃO AQUI ---
  // Antes: p.id === selectedPeriod (Comparava UUID com Data)
  // Agora: p.name === selectedPeriod (Compara "2026-01" com "2026-01")
  const currentPeriodData = periods.find((p: any) => p.name === selectedPeriod)

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Apuração Mensal</h2>
            <p className="text-slate-500">Selecione a competência para processar</p>
        </div>
        
        <div className="flex items-center gap-3">
            <input 
                type="month"
                className="border p-2 rounded-lg font-bold text-slate-700"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
            />
            
            <button 
                onClick={handleProcess}
                disabled={loading}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg transition text-white ${
                    loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
                <Play size={18} />
                {loading ? 'Processando...' : 'Calcular Competência'}
            </button>
        </div>
      </div>

      {currentPeriodData ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentPeriodData.total_value)}
                    </p>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Calendar size={24}/></div>
                <div>
                    <p className="text-sm text-slate-500">Status do Período</p>
                    <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full mt-1 ${
                        currentPeriodData.status === 'PROCESSADO' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                    }`}>
                        {currentPeriodData.status}
                    </span>
                    {currentPeriodData.processed_at && (
                        <p className="text-xs text-slate-400 mt-1">
                            Atualizado em: {new Date(currentPeriodData.processed_at).toLocaleDateString('pt-BR')}
                        </p>
                    )}
                </div>
            </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
            <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-lg font-medium text-slate-900">Nenhum dado encontrado</h3>
            <p className="text-slate-500">Não há cálculo processado para a competência <span className="font-mono font-bold">{selectedPeriod}</span>.</p>
            <p className="text-sm text-slate-400 mt-1">Clique em "Calcular Competência" para gerar a folha.</p>
        </div>
      )}
    </div>
  )
}