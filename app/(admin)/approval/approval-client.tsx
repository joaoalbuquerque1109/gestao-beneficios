/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { CheckCircle, Lock, Calendar, Users, DollarSign } from 'lucide-react'
import { approvePeriod } from '@/app/actions/approval'
import { useRouter } from 'next/navigation'

export default function ApprovalClient({ periods, user }: any) {
  const router = useRouter()

  const handleApprove = async (periodId: string) => {
    if(!confirm(`Confirma a APROVAÇÃO da competência ${periodId}?\nIsso bloqueará novos cálculos.`)) return

    const res = await approvePeriod(periodId, user.email || 'Supervisor')
    if(res.error) alert('Erro: ' + res.error)
    else {
        alert('Competência Aprovada com Sucesso!')
        router.refresh()
    }
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  // Função auxiliar para verificar se está bloqueado (Aprovado, Fechado ou Exportado)
  const isLocked = (status: string) => {
      const s = status?.toUpperCase()
      return s === 'APPROVED' || s === 'APROVADO' || s === 'CLOSED' || s === 'EXPORTADO' || s === 'EXPORTED'
  }

  return (
    <div className="space-y-4 md:space-y-6 flex flex-col md:h-[calc(100vh-6rem)]">
      
      {/* HEADER */}
      <div className="shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
             <CheckCircle className="text-green-600" /> Conferência e Aprovação
          </h2>
          <p className="text-sm text-slate-500">Valide e feche as competências mensais.</p>
      </div>
      
      {/* ÁREA DE DADOS */}
      <div className="bg-slate-50 md:bg-white md:rounded-xl md:shadow-sm md:border md:border-slate-200 flex flex-col flex-1 min-h-0 md:overflow-hidden">
        
        {/* Header Tabela (Desktop) */}
        <div className="hidden md:flex p-4 border-b border-slate-100 justify-between items-center bg-white shrink-0">
            <span className="font-semibold text-slate-700">Competências Pendentes e Histórico</span>
            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 font-bold">
                {periods.length} Registros
            </span>
        </div>

        <div className="md:overflow-auto flex-1 relative p-0 md:p-0">
            
            {/* --- MOBILE: CARDS --- */}
            <div className="md:hidden space-y-3 pb-20">
                {periods.map((p: any) => (
                    <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
                        {/* Topo: Mês e Status */}
                        <div className="flex justify-between items-start mb-4 border-b border-slate-50 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
                                    <Calendar size={20}/>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 font-bold uppercase block">Competência</span>
                                    <span className="font-bold text-slate-800 text-lg">{p.name || p.id}</span>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${
                                isLocked(p.status)
                                ? 'bg-green-50 text-green-700 border-green-200' 
                                : p.status === 'PROCESSADO'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                                {p.status === 'APPROVED' ? 'Aprovado' : p.status}
                            </span>
                        </div>

                        {/* Dados Principais */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-2 text-slate-400 mb-1">
                                    <Users size={14}/> <span className="text-[10px] uppercase font-bold">Funcionários</span>
                                </div>
                                <span className="text-lg font-bold text-slate-700">{p.total_employees}</span>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-2 text-slate-400 mb-1">
                                    <DollarSign size={14}/> <span className="text-[10px] uppercase font-bold">Total Folha</span>
                                </div>
                                <span className="text-lg font-bold text-green-600">{formatCurrency(p.total_value)}</span>
                            </div>
                        </div>

                        {/* Detalhes de Aprovação */}
                        {p.approved_by && (
                            <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded mb-3 flex items-center gap-2">
                                <CheckCircle size={12} className="text-green-500"/>
                                Aprovado por <b>{p.approved_by}</b> em {new Date(p.approved_at).toLocaleDateString()}
                            </div>
                        )}

                        {/* Ação */}
                        <div className="pt-2">
                            {!isLocked(p.status) ? (
                                <button 
                                    onClick={() => handleApprove(p.id)} 
                                    className="w-full flex justify-center items-center gap-2 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 font-bold shadow-sm transition active:scale-95 text-sm"
                                >
                                    <CheckCircle size={16}/> Aprovar Folha
                                </button>
                            ) : (
                                <div className="w-full py-2.5 bg-slate-100 text-slate-400 rounded-lg font-bold flex justify-center items-center gap-2 border border-slate-200 text-sm">
                                    <Lock size={16}/> Fechado / Exportado
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* --- DESKTOP: TABELA --- */}
            <div className="hidden md:block">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-4 whitespace-nowrap">Competência</th>
                            <th className="px-6 py-4 whitespace-nowrap text-center">Status</th>
                            <th className="px-6 py-4 whitespace-nowrap text-center">Funcionários</th>
                            <th className="px-6 py-4 whitespace-nowrap">Total (R$)</th>
                            <th className="px-6 py-4 whitespace-nowrap">Aprovado Por</th>
                            <th className="px-6 py-4 text-right whitespace-nowrap">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {periods.map((p: any) => (
                            <tr key={p.id} className="hover:bg-blue-50/30 transition">
                                <td className="px-6 py-4 font-bold text-slate-800">{p.name || p.id}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${
                                        isLocked(p.status)
                                        ? 'bg-green-50 text-green-700 border-green-200' 
                                        : p.status === 'PROCESSADO'
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}>
                                        {p.status === 'APPROVED' ? 'APROVADO' : p.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center font-medium">{p.total_employees}</td>
                                <td className="px-6 py-4 font-mono text-slate-700 font-bold">
                                    {formatCurrency(p.total_value)}
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-500">
                                    {p.approved_by ? (
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-700">{p.approved_by}</span>
                                            <span className="text-[10px]">{new Date(p.approved_at).toLocaleString()}</span>
                                        </div>
                                    ) : '-'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {!isLocked(p.status) ? (
                                        <button 
                                            onClick={() => handleApprove(p.id)} 
                                            className="inline-flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 text-xs font-bold transition shadow-sm hover:-translate-y-0.5"
                                        >
                                            <CheckCircle size={14}/> Aprovar
                                        </button>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-md text-xs font-bold cursor-not-allowed">
                                            <Lock size={12}/> Fechado
                                        </span>
                                    )}
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