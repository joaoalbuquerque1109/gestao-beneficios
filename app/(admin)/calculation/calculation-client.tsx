/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { Play, Calendar, DollarSign, Users, CreditCard, Loader2 } from 'lucide-react'
// Importe a nova função de busca e a biblioteca XLSX
import { processPeriod, getPeriodDataForExport } from '@/app/actions/calculation'
import * as XLSX from 'xlsx'

export default function CalculationClient({ periods, user }: any) {
  const [selectedPeriod, setSelectedPeriod] = useState(
    new Date().toISOString().slice(0, 7) // Mês atual Ex: "2026-01"
  )
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false) // Estado separado para o botão de exportar

  const handleProcess = async () => {
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
        window.location.reload()
    }
  }

  // --- NOVA FUNÇÃO: EXPORTAR VALECARD ---
  const handleExportValecard = async () => {
    if (!currentPeriodData || currentPeriodData.status !== 'PROCESSADO') {
        return alert('É necessário processar a competência antes de exportar.')
    }

    setExporting(true)

    // 1. Busca os dados completos no servidor
    const { data, error } = await getPeriodDataForExport(selectedPeriod)
    
    if (error || !data || data.length === 0) {
        alert('Erro ao buscar dados ou folha vazia.')
        setExporting(false)
        return
    }

    // 2. Formata para o layout Valecard (Matrícula, Referência, Nome, Dt. Nascimento, CPF, Valor)
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }

    const dataToExport = data.map((r: any) => {
        const emp = r.employees || {}
        return {
            'Matrícula': r.employee_id,
            'Referência': emp.department_id || 'GERAL',
            'Nome': r.employee_name,
            'Dt. Nascimento': formatDate(emp.birth_date),
            'CPF': emp.cpf ? emp.cpf.replace(/\D/g, '') : '', // Apenas números
            'Valor': r.total_receivable
        }
    })

    // 3. Gera e baixa o Excel
    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Pedido")
    const fileName = `Pedido_Valecard_${selectedPeriod}.xlsx`
    XLSX.writeFile(wb, fileName)

    setExporting(false)
  }

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
                    
                    {/* --- BOTÃO DE EXPORTAÇÃO INSERIDO AQUI --- */}
                    {currentPeriodData.status === 'PROCESSADO' && (
                        <div className="mt-3">
                             <button 
                                onClick={handleExportValecard}
                                disabled={exporting}
                                className="flex items-center gap-2 text-xs font-bold text-purple-600 hover:text-purple-800 transition disabled:opacity-50"
                            >
                                {exporting ? <Loader2 size={14} className="animate-spin"/> : <CreditCard size={14} />}
                                {exporting ? 'Gerando...' : 'Baixar Arquivo Valecard'}
                            </button>
                        </div>
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