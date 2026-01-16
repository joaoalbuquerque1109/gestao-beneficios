/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { History, Lock, FileKey } from 'lucide-react'
import { sealPeriod } from '@/app/actions/audit'

export default function AuditClient({ records, approvedPeriods, user }: any) {
  const [loading, setLoading] = useState(false)

  const handleSeal = async (periodId: string) => {
    if(!confirm(`CONFIRMAÇÃO DE SEGURANÇA:\n\nDeseja selar a competência ${periodId}?\nIsso gera um registro imutável e um Hash de integridade.\nEssa ação não pode ser desfeita.`)) return

    setLoading(true)
    const res = await sealPeriod(periodId, user.email || 'Admin')
    setLoading(false)

    if(res.error) alert('Erro: ' + res.error)
    else {
        alert(`Sucesso! Hash de Integridade gerado: ${res.hash}`)
        window.location.reload()
    }
  }

  return (
    <div className="space-y-8">
      {/* Seção 1: Pendentes de Selagem (Opcional, mas útil) */}
      {approvedPeriods.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
            <h3 className="font-bold text-orange-800 flex items-center gap-2 mb-4">
                <FileKey size={20}/> Pendentes de Fechamento (Exportação)
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {approvedPeriods.map((p: any) => (
                    <div key={p.id} className="bg-white p-4 rounded-lg shadow-sm border border-orange-100 flex justify-between items-center">
                        <div>
                            <p className="font-bold text-slate-700">{p.id}</p>
                            <p className="text-xs text-slate-500">Aprovado por: {p.approved_by}</p>
                        </div>
                        <button 
                            onClick={() => handleSeal(p.id)}
                            disabled={loading}
                            className="bg-orange-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
                        >
                            {loading ? 'Selando...' : 'Gerar Hash'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* Seção 2: Histórico de Auditoria (Tabela Principal) */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <History className="text-slate-600"/> Auditoria e Histórico
          </h2>
          <p className="text-sm text-slate-500">Registro imutável de fechamentos mensais (Legally Defensible).</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Competência</th>
                <th className="px-6 py-4">Total Pago</th>
                <th className="px-6 py-4">Colaboradores</th>
                <th className="px-6 py-4">Exportado Por</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Integridade (Hash)</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr><td colSpan={7} className="text-center p-8 text-slate-400">Nenhum histórico de fechamento encontrado.</td></tr>
              ) : (
                records.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-bold text-slate-800">{r.name}</td>
                    <td className="px-6 py-4 font-medium text-green-700">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.total_value)}
                    </td>
                    <td className="px-6 py-4">{r.total_employees}</td>
                    <td className="px-6 py-4 font-medium">{r.exported_by}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(r.exported_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                        <code className="bg-slate-100 px-2 py-1 rounded text-[10px] font-mono text-slate-500 border border-slate-200 block w-32 truncate" title={r.integrity_hash}>
                            {r.integrity_hash}
                        </code>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1 text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs font-bold shadow-sm">
                            <Lock size={12} /> Fechado
                        </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}