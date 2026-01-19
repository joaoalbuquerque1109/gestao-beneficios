/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { History, Lock, FileKey, ShieldCheck, User, Calendar, FileDown, Loader2 } from 'lucide-react'
import { sealPeriod } from '@/app/actions/audit'
import { getPeriodDataForExport } from '@/app/actions/calculation' // Reutilizamos a query de exportação
import * as XLSX from 'xlsx'

export default function AuditClient({ records, approvedPeriods, user }: any) {
  const [loadingSeal, setLoadingSeal] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // --- AÇÃO 1: Selar Período ---
  const handleSeal = async (periodId: string) => {
    if(!confirm(`CONFIRMAÇÃO DE SEGURANÇA:\n\nDeseja selar a competência ${periodId}?\nIsso gera um registro imutável e um Hash de integridade.\nEssa ação não pode ser desfeita.`)) return

    setLoadingSeal(true)
    const res = await sealPeriod(periodId, user.email || 'Admin')
    setLoadingSeal(false)

    if(res.error) alert('Erro: ' + res.error)
    else {
        alert(`Sucesso! Hash de Integridade gerado: ${res.hash}`)
        window.location.reload()
    }
  }

  // --- AÇÃO 2: Baixar Evidência (Excel) ---
  const handleDownloadEvidence = async (periodId: string, hash: string) => {
    setDownloadingId(periodId)
    
    try {
        // Busca os dados congelados daquele período
        const { data, error } = await getPeriodDataForExport(periodId)

        if (error || !data || data.length === 0) {
            alert('Erro: Não foi possível recuperar os dados de evidência deste período.')
            return
        }

        // Formata igual ao arquivo original
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
                'CPF': emp.cpf ? emp.cpf.replace(/\D/g, '') : '', 
                'Valor': r.total_receivable
            }
        })

        // Gera o Excel
        const ws = XLSX.utils.json_to_sheet(dataToExport)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Evidencia_Auditoria")
        
        // Nome do arquivo inclui o Hash curto para conferência
        const shortHash = hash.substring(0, 8)
        XLSX.writeFile(wb, `EVIDENCIA_${periodId}_${shortHash}.xlsx`)

    } catch (err) {
        console.error(err)
        alert('Erro ao gerar arquivo de evidência.')
    } finally {
        setDownloadingId(null)
    }
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="space-y-6 md:space-y-8 flex flex-col md:h-[calc(100vh-6rem)]">
      
      {/* HEADER */}
      <div className="shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
             <History className="text-slate-600"/> Auditoria e Logs
          </h2>
          <p className="text-sm text-slate-500">Rastreabilidade e segurança dos fechamentos.</p>
      </div>

      {/* ÁREA DE CONTEÚDO SCROLLÁVEL */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-20 md:pb-0 space-y-8 pr-1 md:pr-4">
          
          {/* Seção 1: Pendentes de Selagem */}
          {approvedPeriods.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 md:p-6 shadow-sm">
                <h3 className="font-bold text-orange-800 flex items-center gap-2 mb-4 text-sm md:text-base">
                    <FileKey size={20}/> Pendentes de Fechamento (Exportação)
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {approvedPeriods.map((p: any) => (
                        <div key={p.id} className="bg-white p-4 rounded-lg shadow-sm border border-orange-100 flex flex-col md:flex-row justify-between md:items-center gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800 text-lg">{p.name || p.id}</span>
                                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase border border-green-200">Aprovado</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                    <User size={12}/> Por: {p.approved_by}
                                </p>
                            </div>
                            <button 
                                onClick={() => handleSeal(p.id)}
                                disabled={loadingSeal}
                                className="w-full md:w-auto bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-700 disabled:opacity-50 shadow-sm transition active:scale-95 flex justify-center items-center gap-2"
                            >
                                <Lock size={16}/> {loadingSeal ? 'Selando...' : 'Gerar Hash'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
          )}

          {/* Seção 2: Histórico (Cards Mobile / Tabela Desktop) */}
          <div className="space-y-4">
             <div className="hidden md:block">
                <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                    <ShieldCheck className="text-green-600" size={20}/> Histórico Imutável
                </h3>
             </div>

             {/* --- MOBILE: CARDS --- */}
             <div className="md:hidden space-y-4">
                {records.length === 0 ? (
                    <div className="text-center p-8 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                        Nenhum registro encontrado.
                    </div>
                ) : records.map((r: any) => (
                    <div key={r.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                        {/* Faixa lateral */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-400"></div>
                        
                        <div className="flex justify-between items-start mb-3 pl-2">
                            <div className="flex flex-col">
                                <span className="text-xs text-slate-400 uppercase font-bold flex items-center gap-1">
                                    <Calendar size={12}/> Competência
                                </span>
                                <span className="font-bold text-lg text-slate-800">{r.id}</span>
                            </div>
                            
                            {/* Botão Mobile Download */}
                            <button 
                                onClick={() => handleDownloadEvidence(r.id, r.integrity_hash)}
                                disabled={downloadingId === r.id}
                                className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition"
                                title="Baixar Evidência"
                            >
                                {downloadingId === r.id ? <Loader2 size={20} className="animate-spin"/> : <FileDown size={20}/>}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pl-2 mb-3">
                            <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                <span className="text-[10px] text-slate-400 uppercase block font-bold mb-1">Total Pago</span>
                                <span className="text-green-700 font-bold text-sm">{formatCurrency(r.total_value)}</span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                <span className="text-[10px] text-slate-400 uppercase block font-bold mb-1">Colaboradores</span>
                                <span className="text-slate-700 font-bold text-sm">{r.total_employees}</span>
                            </div>
                        </div>

                        <div className="pl-2 space-y-2">
                            <div className="pt-2">
                                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Hash de Integridade</div>
                                <code className="block bg-slate-900 text-green-400 p-2 rounded text-[10px] font-mono break-all border border-slate-700">
                                    {r.integrity_hash}
                                </code>
                            </div>
                        </div>
                    </div>
                ))}
             </div>

             {/* --- DESKTOP: TABELA --- */}
             <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Competência</th>
                            <th className="px-6 py-4">Total Pago</th>
                            <th className="px-6 py-4">Colaboradores</th>
                            <th className="px-6 py-4">Responsável</th>
                            <th className="px-6 py-4">Integridade (Hash)</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-right">Evidência</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {records.length === 0 ? (
                            <tr><td colSpan={7} className="text-center p-8 text-slate-400">Nenhum histórico encontrado.</td></tr>
                        ) : records.map((r: any) => (
                            <tr key={r.id} className="hover:bg-slate-50 transition">
                                <td className="px-6 py-4 font-bold text-slate-800">{r.id}</td>
                                <td className="px-6 py-4 font-medium text-green-700 font-mono">
                                    {formatCurrency(r.total_value)}
                                </td>
                                <td className="px-6 py-4 text-center">{r.total_employees}</td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col text-xs">
                                        <span className="font-bold text-slate-700">{r.exported_by}</span>
                                        <span className="text-slate-400">{new Date(r.exported_at).toLocaleString('pt-BR')}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <code className="bg-slate-50 px-2 py-1 rounded text-[10px] font-mono text-slate-500 border border-slate-200 block w-24 lg:w-40 truncate hover:w-auto hover:absolute hover:bg-white hover:shadow-lg hover:z-10 transition-all cursor-help" title={r.integrity_hash}>
                                        {r.integrity_hash}
                                    </code>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="inline-flex items-center gap-1 text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs font-bold shadow-sm">
                                        <Lock size={12} /> Fechado
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => handleDownloadEvidence(r.id, r.integrity_hash)}
                                        disabled={downloadingId === r.id}
                                        className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-xs font-bold transition shadow-sm disabled:opacity-50"
                                        title="Baixar Planilha de Evidência"
                                    >
                                        {downloadingId === r.id ? <Loader2 size={14} className="animate-spin"/> : <FileDown size={14}/>}
                                        {downloadingId === r.id ? 'Baixando...' : 'Baixar'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
          </div>
      </div>
    </div>
  )
}