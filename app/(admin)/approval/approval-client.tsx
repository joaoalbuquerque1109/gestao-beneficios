/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { CheckCircle, Lock } from 'lucide-react'
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

  // Apenas Supervisores/Admins podem ver o botão (Lógica visual, a real está no server action se quisermos proteger)
  // const canApprove = user?.user_metadata?.role === 'Supervisor' || ...

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Conferência e Aprovação</h2>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 border-b">
                <tr>
                    <th className="px-6 py-4">Mês</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Funcionários</th>
                    <th className="px-6 py-4">Total (R$)</th>
                    <th className="px-6 py-4">Aprovado Por</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {periods.map((p: any) => (
                    <tr key={p.id}>
                        <td className="px-6 py-4 font-bold">{p.name}</td>
                        <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                p.status === 'APROVADO' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                                {p.status}
                            </span>
                        </td>
                        <td className="px-6 py-4">{p.total_employees}</td>
                        <td className="px-6 py-4 font-mono">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.total_value)}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                            {p.approved_by ? (
                                <div>{p.approved_by}<br/>{new Date(p.approved_at).toLocaleDateString()}</div>
                            ) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                            {p.status !== 'APROVADO' ? (
                                <button onClick={() => handleApprove(p.id)} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-xs font-bold">
                                    <CheckCircle size={14}/> Aprovar
                                </button>
                            ) : (
                                <span className="text-green-600 flex items-center gap-1 text-xs font-bold border border-green-200 px-2 py-1 rounded">
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
  )
}