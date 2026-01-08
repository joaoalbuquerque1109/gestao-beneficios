/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { 
  Save, Settings as SettingsIcon, Calendar, Building, MapPin, List, 
  Plus, Trash2, Lock, Unlock, AlertTriangle, Database, RefreshCw, FileX 
} from 'lucide-react'
// CORREÇÃO: Importando o nome correto 'updateGlobalSettings'
import { updateGlobalSettings, manageListItem, togglePeriodStatus, resetSystem } from '@/app/actions/settings'

export default function SettingsClient({ initialConfig, departments, locations, statuses, periods, user }: any) {
  const [loading, setLoading] = useState(false)
  
  // Configuração Global
  const [formData, setFormData] = useState({
    dailyValueVA: initialConfig.daily_value_va,
    basketValue: initialConfig.basket_value,
    basketLimit: initialConfig.basket_limit,
    cutoffDay: initialConfig.cutoff_day,
    workingDays: 22 // Default visual
  })

  // Inputs locais para as listas
  const [newDept, setNewDept] = useState('')
  const [newLoc, setNewLoc] = useState('')
  const [newStatus, setNewStatus] = useState('')

  // --- Handlers ---

  const handleSaveGlobal = async () => {
    setLoading(true)
    // CORREÇÃO: Chamando a função com o nome correto
    await updateGlobalSettings(formData, user.email || 'Admin')
    setLoading(false)
    alert('Parâmetros salvos com sucesso!')
  }

  const handleListAction = async (table: 'departments' | 'locations' | 'employee_statuses', action: 'ADD' | 'DELETE' | 'TOGGLE', itemData: any) => {
    if (action === 'ADD' && !itemData.name) return
    if (action === 'DELETE' && !confirm('Tem certeza? Isso pode afetar históricos antigos.')) return

    await manageListItem(table, action, itemData)
    
    // Limpar inputs
    if (action === 'ADD') {
        if (table === 'departments') setNewDept('')
        if (table === 'locations') setNewLoc('')
        if (table === 'employee_statuses') setNewStatus('')
    }
    // Refresh forçado simples para atualizar as listas
    window.location.reload()
  }

  const handleTogglePeriod = async (id: string, isOpen: boolean) => {
      await togglePeriodStatus(id, isOpen)
      window.location.reload()
  }

  const handleReset = async (type: 'EMPLOYEES' | 'ABSENCES' | 'CALCULATION') => {
      const msg = type === 'EMPLOYEES' ? 'ATENÇÃO: Isso apagará TODOS os funcionários e histórico!' :
                  type === 'ABSENCES' ? 'ATENÇÃO: Isso apagará todas as faltas lançadas!' :
                  'Isso zerará os cálculos não fechados.'
      
      if (confirm(msg + '\n\nDeseja continuar?')) {
          await resetSystem(type, user.email || 'Admin')
          alert('Sistema resetado com sucesso.')
          window.location.reload()
      }
  }

  return (
    <div className="space-y-8 pb-10">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <SettingsIcon className="text-slate-600"/> Configurações do Sistema
      </h2>

      {/* 1. Parâmetros Globais */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-purple-600 font-bold mb-4 flex items-center gap-2">
            <SettingsIcon size={18}/> Parâmetros Globais
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Valor Diário (VA)</label>
                <input type="number" step="0.01" className="w-full border p-2 rounded text-black" 
                    value={formData.dailyValueVA} onChange={e => setFormData({...formData, dailyValueVA: e.target.value})} />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Valor Cesta</label>
                <input type="number" step="0.01" className="w-full border p-2 rounded text-black" 
                    value={formData.basketValue} onChange={e => setFormData({...formData, basketValue: e.target.value})} />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Teto Salarial Cesta</label>
                <input type="number" step="0.01" className="w-full border p-2 rounded text-black" 
                    value={formData.basketLimit} onChange={e => setFormData({...formData, basketLimit: e.target.value})} />
            </div>
            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Dias Úteis Padrão</label>
                    <input type="number" className="w-full border p-2 rounded text-black" 
                        value={formData.workingDays} onChange={e => setFormData({...formData, workingDays: Number(e.target.value)})} />
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Dia Fechamento</label>
                    <input type="number" className="w-full border p-2 rounded text-black" 
                        value={formData.cutoffDay} onChange={e => setFormData({...formData, cutoffDay: e.target.value})} />
                    <p className="text-[10px] text-slate-400 mt-1">Dia do corte mensal (Ex: 15)</p>
                </div>
            </div>
        </div>
        <div className="flex justify-end mt-4">
            <button onClick={handleSaveGlobal} disabled={loading} className="bg-purple-600 text-white px-6 py-2 rounded font-bold hover:bg-purple-700 transition flex items-center gap-2">
                <Save size={18}/> {loading ? 'Salvando...' : 'Salvar Parâmetros'}
            </button>
        </div>
      </div>

      {/* 2. Gestão de Períodos */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
         <h3 className="text-indigo-600 font-bold mb-4 flex items-center gap-2">
            <Calendar size={18}/> Gestão de Períodos
         </h3>
         <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500">
                    <tr><th className="p-2">Referência</th><th className="p-2">Dias Úteis Salvos</th><th className="p-2 text-right">Status</th></tr>
                </thead>
                <tbody className="divide-y">
                    {periods.map((p: any) => (
                        <tr key={p.id}>
                            <td className="p-2 font-medium text-black">{p.id}</td>
                            <td className="p-2 text-black">{p.working_days}</td>
                            <td className="p-2 text-right">
                                <button onClick={() => handleTogglePeriod(p.id, p.is_open)} 
                                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ml-auto w-fit ${p.is_open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {p.is_open ? <Unlock size={12}/> : <Lock size={12}/>}
                                    {p.is_open ? 'ABERTO' : 'FECHADO'}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 3. Secretarias */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <h3 className="text-blue-600 font-bold mb-4 flex items-center gap-2">
                <Building size={18}/> Secretarias
             </h3>
             <div className="flex gap-2 mb-4">
                <input placeholder="NOVA SECRETARIA" className="flex-1 border p-2 rounded uppercase text-sm" 
                    value={newDept} onChange={e => setNewDept(e.target.value)} />
                <button onClick={() => handleListAction('departments', 'ADD', { name: newDept })} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"><Plus/></button>
             </div>
             <div className="max-h-48 overflow-y-auto space-y-1">
                {departments.map((d: any) => (
                    <div key={d.id} className="flex justify-between items-center p-2 hover:bg-slate-50 border-b border-slate-100">
                        <span className="text-sm font-medium text-black">{d.name}</span>
                        <div className="flex gap-2">
                            <button onClick={() => handleListAction('departments', 'TOGGLE', { id: d.id, currentStatus: d.status })}
                                className={`text-[10px] px-2 py-1 rounded font-bold ${d.status === 'ATIVO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {d.status}
                            </button>
                            <button onClick={() => handleListAction('departments', 'DELETE', { id: d.id })} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                        </div>
                    </div>
                ))}
             </div>
          </div>

          {/* 4. Filiais */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <h3 className="text-orange-600 font-bold mb-4 flex items-center gap-2">
                <MapPin size={18}/> Filiais
             </h3>
             <div className="flex gap-2 mb-4">
                <input placeholder="NOVA FILIAL" className="flex-1 border p-2 rounded uppercase text-sm" 
                    value={newLoc} onChange={e => setNewLoc(e.target.value)} />
                <button onClick={() => handleListAction('locations', 'ADD', { name: newLoc })} className="bg-orange-600 text-white p-2 rounded hover:bg-orange-700"><Plus/></button>
             </div>
             <div className="max-h-48 overflow-y-auto space-y-1">
                {locations.map((l: any) => (
                    <div key={l.id} className="flex justify-between items-center p-2 hover:bg-slate-50 border-b border-slate-100">
                        <span className="text-sm font-medium text-black">{l.name}</span>
                        <div className="flex gap-2">
                            <button onClick={() => handleListAction('locations', 'TOGGLE', { id: l.id, currentStatus: l.status })}
                                className={`text-[10px] px-2 py-1 rounded font-bold ${l.status === 'ATIVO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {l.status}
                            </button>
                            <button onClick={() => handleListAction('locations', 'DELETE', { id: l.id })} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                        </div>
                    </div>
                ))}
             </div>
          </div>
      </div>

      {/* 5. Status */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
         <h3 className="text-slate-600 font-bold mb-4 flex items-center gap-2">
            <List size={18}/> Status de Funcionários
         </h3>
         <div className="flex gap-2 mb-4 max-w-md">
            <input placeholder="NOVO STATUS" className="flex-1 border p-2 rounded uppercase text-sm" 
                value={newStatus} onChange={e => setNewStatus(e.target.value)} />
            <button onClick={() => handleListAction('employee_statuses', 'ADD', { name: newStatus })} className="bg-slate-600 text-white p-2 rounded hover:bg-slate-700"><Plus/></button>
         </div>
         <div className="border border-slate-100 rounded overflow-hidden">
            {statuses.map((s: any) => (
                <div key={s.id} className="flex justify-between items-center p-3 hover:bg-slate-50 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-black">{s.name}</span>
                    <div className="flex gap-2">
                        <button onClick={() => handleListAction('employee_statuses', 'TOGGLE', { id: s.id, currentStatus: s.status })}
                            className={`text-[10px] px-2 py-1 rounded font-bold ${s.status === 'ATIVO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {s.status}
                        </button>
                        <button onClick={() => handleListAction('employee_statuses', 'DELETE', { id: s.id })} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                    </div>
                </div>
            ))}
         </div>
      </div>

      {/* 6. Ações do Sistema */}
      <div className="bg-orange-50 p-6 rounded-xl border border-orange-200">
         <h3 className="text-orange-800 font-bold mb-2 flex items-center gap-2">
            <AlertTriangle size={20}/> Ações do Sistema
         </h3>
         <p className="text-orange-700 text-sm mb-6">Ferramentas de manutenção de dados. O histórico de períodos APROVADOS é sempre preservado.</p>
         
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1 */}
            <div className="bg-white p-4 rounded-lg border border-orange-100 shadow-sm">
                <div className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Database size={16}/> Base de Funcionários</div>
                <p className="text-xs text-slate-500 mb-4 h-8">Apaga todos os funcionários e movimentações. Necessário reimportar a planilha de cadastro.</p>
                <button onClick={() => handleReset('EMPLOYEES')} className="w-full border border-red-200 text-red-600 font-bold text-xs py-2 rounded hover:bg-red-50 flex items-center justify-center gap-2">
                    <Trash2 size={14}/> RESETAR FUNCIONÁRIOS
                </button>
            </div>
            {/* Card 2 */}
            <div className="bg-white p-4 rounded-lg border border-orange-100 shadow-sm">
                <div className="font-bold text-slate-800 mb-2 flex items-center gap-2"><FileX size={16}/> Base de Faltas</div>
                <p className="text-xs text-slate-500 mb-4 h-8">Apaga todas as faltas importadas (não aprovadas) e zera os cálculos pendentes.</p>
                <button onClick={() => handleReset('ABSENCES')} className="w-full border border-orange-300 text-orange-600 font-bold text-xs py-2 rounded hover:bg-orange-50 flex items-center justify-center gap-2">
                    <Trash2 size={14}/> RESETAR FALTAS
                </button>
            </div>
            {/* Card 3 */}
            <div className="bg-white p-4 rounded-lg border border-orange-100 shadow-sm">
                <div className="font-bold text-slate-800 mb-2 flex items-center gap-2"><RefreshCw size={16}/> Apuração Mensal</div>
                <p className="text-xs text-slate-500 mb-4 h-8">Zera apenas os resultados dos cálculos não aprovados. Mantém funcionários e faltas.</p>
                <button onClick={() => handleReset('CALCULATION')} className="w-full border border-orange-300 text-orange-600 font-bold text-xs py-2 rounded hover:bg-orange-50 flex items-center justify-center gap-2">
                    <RefreshCw size={14}/> RESETAR APURAÇÃO
                </button>
            </div>
         </div>
      </div>

    </div>
  )
}