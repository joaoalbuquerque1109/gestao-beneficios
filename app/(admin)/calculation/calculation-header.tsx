'use client'

import { useState } from 'react'
import { reopenPeriod } from '@/app/actions/periods' // Removemos approvePeriod daqui
import { Lock, CheckCircle, Unlock, FileDown, Loader2, Clock, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link' // Importante para o link de redirecionamento

interface CalculationHeaderProps {
  periodId: string
  periodStatus: 'OPEN' | 'PROCESSADO' | 'APPROVED' | 'CLOSED' | string
  userRole: string
  onExport: () => void
  isExporting: boolean 
}

export function CalculationHeader({ 
  periodId, 
  periodStatus, 
  userRole,
  onExport,
  isExporting 
}: CalculationHeaderProps) {
  const [isLoading, setIsLoading] = useState(false)

  // Removemos handleApprove daqui pois não é mais responsabilidade desta tela

  const handleReopen = async () => {
    if(!confirm("Tem certeza que deseja reabrir para ajustes? Se já houver aprovação, ela será revogada.")) return;

    setIsLoading(true)
    const result = await reopenPeriod(periodId)
    setIsLoading(false)

    if (result.error) toast.error(result.error)
    else toast.info('Competência reaberta para manutenção.')
  }

  const isDownloadAllowed = ['APROVADO', 'CLOSED'].includes(periodStatus)
  const isProcessed = periodStatus === 'PROCESSADO'
  const isExported = periodStatus === 'EXPORTADO'
  const canManage = ['ADMIN', 'RH'].includes(userRole)

  return (
    <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-slate-200 gap-4">
      
      {/* Lado Esquerdo: Status Visual */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Apuração Mensal</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-slate-500">Status Atual:</span>
          
          {isDownloadAllowed ? (
            <span className="flex items-center gap-1 text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full border border-green-200">
              <CheckCircle size={12} /> APROVADO PARA PAGAMENTO
            </span>
          ): isExported ? (
            <span className="flex items-center gap-1 text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded-full border border-purple-200">
              <Lock size={12} /> FOLHA EXPORTADA
            </span>
          )
           : isProcessed ? (
            <span className="flex items-center gap-1 text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full border border-blue-200">
              <Clock size={12} /> AGUARDANDO APROVAÇÃO
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full border border-amber-200">
              <Unlock size={12} /> CÁLCULO PENDENTE
            </span>
          )}
        </div>
      </div>

      {/* Lado Direito: Ações */}
      <div className="flex items-center gap-3">
        
        {/* LÓGICA MUDADA: Se estiver processado, avisa onde aprovar */}
        {isProcessed && !isDownloadAllowed && (
          <div className="flex items-center gap-2">
             <div className="text-xs text-slate-500 text-right hidden md:block">
                Arquivo bloqueado.<br/>
                Necessário aprovação gerencial.
             </div>
             {canManage && (
               <Link 
                 href="/approval" 
                 className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition text-sm font-medium border border-slate-300"
               >
                 Ir para Aprovação <ExternalLink size={14}/>
               </Link>
             )}
          </div>
        )}

        {/* BOTÃO DE REABRIR: (Só para Admin/RH se precisar corrigir algo antes de aprovar ou depois) */}
        {isProcessed && canManage && (
          <button
            onClick={handleReopen}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-red-600 text-sm underline decoration-dotted"
          >
            Corrigir/Reabrir
          </button>
        )}

        {/* BOTÃO DE EXPORTAR: Só aparece se estiver aprovado */}
        {isDownloadAllowed ? (
          <button
            onClick={onExport}
            disabled={isExporting} 
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm transition hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-wait"
          >
            {isExporting ? <Loader2 size={18} className="animate-spin"/> : <FileDown size={18} />}
            {isExporting ? 'Gerando CSV...' : 'Baixar Arquivo Valecard'}
          </button>
        ) : (
           // Se não for admin/rh e estiver bloqueado, mostra só o cadeado
           !isProcessed && (
            <button
                disabled
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-400 rounded border border-slate-200 cursor-not-allowed"
            >
                <Lock size={16} />
                Exportar CSV
            </button>
           )
        )}
      </div>
    </div>
  )
}