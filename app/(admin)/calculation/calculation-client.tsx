/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { Play, Calendar, DollarSign, Users } from 'lucide-react'
import { processPeriod } from '@/app/actions/calculation'

export default function CalculationClient({ periods, user }: any) {
  const [selectedPeriod, setSelectedPeriod] = useState(
    new Date().toISOString().slice(0, 7) // Mês atual YYYY-MM
  )
  const [loading, setLoading] = useState(false)

  const handleProcess = async () => {
    if (!confirm(`Deseja processar o cálculo para ${selectedPeriod}? Isso atualizará os valores existentes.`)) return
    
    setLoading(true)
    const res = await processPeriod(selectedPeriod, user.email || 'Admin')
    setLoading(false)

    if (res.error) alert(res.error)
    else {
        alert(`Cálculo concluído!\nFuncionários: ${res.count}\nTotal: R$ ${res.total!.toFixed(2)}`)
        window.location.reload()
    }
  }

  // Encontra dados do período selecionado se já existir
  const currentPeriodData = periods.find((p: any) => p.id === selectedPeriod)

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
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
                <Play size={18} />
                {loading ? 'Processando...' : 'Calcular'}
            </button>
        </div>
      </div>

      {currentPeriodData ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Users size={24}/></div>
                <div>
                    <p className="text-sm text-slate-500">Processados</p>
                    <p className="text-2xl font-bold">{currentPeriodData.total_employees}</p>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-green-50 text-green-600 rounded-lg"><DollarSign size={24}/></div>
                <div>
                    <p className="text-sm text-slate-500">Valor Total</p>
                    <p className="text-2xl font-bold text-green-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentPeriodData.total_value)}
                    </p>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Calendar size={24}/></div>
                <div>
                    <p className="text-sm text-slate-500">Status</p>
                    <span className="inline-block px-2 py-1 text-xs font-bold bg-purple-100 text-purple-700 rounded mt-1">
                        {currentPeriodData.status}
                    </span>
                </div>
            </div>
        </div>
      ) : (
        <div className="text-center p-12 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-400">
            Nenhum cálculo processado para esta competência ainda.
        </div>
      )}
    </div>
  )
}