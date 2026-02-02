/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { 
  Save, Settings as SettingsIcon, Calendar, Building, MapPin, List, 
  Plus, Trash2, Lock, Unlock, AlertTriangle, Database, RefreshCw, FileX, ToggleLeft, ToggleRight, Edit, 
} from 'lucide-react'
import { updateGlobalSettings, manageListItem, togglePeriodStatus, resetSystem, resetAdjustments, saveEmployeeStatus } from '@/app/actions/settings'
import StatusRulesModal from '@/components/StatusRulesModal'

export default function SettingsClient({ initialConfig, departments, locations, statuses, periods, user }: any) {
  const [loading, setLoading] = useState(false)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<any>(null)
  
  // Configuração Global
  const [formData, setFormData] = useState({
    dailyValueVA: initialConfig.daily_value_va,
    basketValue: initialConfig.basket_value,
    basketLimit: initialConfig.basket_limit,
    cutoffDay: initialConfig.cutoff_day,
    businessDays: initialConfig.business_days
  })

  // Inputs locais
  const [newDept, setNewDept] = useState('')
  const [newLoc, setNewLoc] = useState('')
  const [newStatus, setNewStatus] = useState('')

  // --- Handlers ---

  const handleSaveGlobal = async () => {
    setLoading(true)
    await updateGlobalSettings(formData, user.email || 'Admin')
    setLoading(false)
    alert('Parâmetros salvos com sucesso!')
  }

  const handleListAction = async (table: 'departments' | 'locations' | 'employee_statuses', action: 'ADD' | 'DELETE' | 'TOGGLE', itemData: any) => {
    if (action === 'ADD' && !itemData.name) return
    if (action === 'DELETE' && !confirm('Tem certeza? Isso pode afetar históricos antigos.')) return

    await manageListItem(table, action, itemData)
    
    if (action === 'ADD') {
        if (table === 'departments') setNewDept('')
        if (table === 'locations') setNewLoc('')
        if (table === 'employee_statuses') setNewStatus('')
    }
    window.location.reload()
  }

  const handleOpenStatusModal = (status?: any) => {
    setSelectedStatus(status)
    setStatusModalOpen(true)
  }

  const handleSaveStatus = async (data: any) => {
    setLoading(true)
    const result = await saveEmployeeStatus(data, !selectedStatus)
    setLoading(false)

    if (result.error) {
      alert(`Erro: ${result.error}`)
    } else {
      alert('Status salvo com sucesso!')
      setStatusModalOpen(false)
      setSelectedStatus(null)
      window.location.reload()
    }
  }

  const handleTogglePeriod = async (id: string, isOpen: boolean) => {
      await togglePeriodStatus(id, isOpen)
      window.location.reload()
  }

  // 1. Adicione 'adjustments' ao tipo do handleReset se necessário
const handleReset = async (type: 'EMPLOYEES' | 'ABSENCES' | 'CALCULATION' | 'ADJUSTMENTS') => {
    // Identifica o período aberto atual para o reset de ajustes
    const activePeriod = periods.find((p: any) => p.is_open === true)?.name;

    const messages = {
        EMPLOYEES: 'ATENÇÃO: Isso apagará TODOS os funcionários e histórico!',
        ABSENCES: 'ATENÇÃO: Isso apagará todas as faltas lançadas!',
        CALCULATION: 'Isso zerará os cálculos não fechados.',
        ADJUSTMENTS: `Isso apagará todos os ajustes do período ${activePeriod || 'atual'}!`
    };

    if (confirm(messages[type] + '\n\nDeseja continuar?')) {
        setLoading(true);
        let result;

        if (type === 'ADJUSTMENTS') {
            if (!activePeriod) {
                alert("Erro: Nenhum período aberto encontrado para resetar ajustes.");
                setLoading(false);
                return;
            }
            result = await resetAdjustments(activePeriod, user.email || 'Admin');
        } else {
            result = await resetSystem(type, user.email || 'Admin');
        }

        if (result?.error) {
            alert(`Ação Bloqueada: ${result.error}`);
        } else {
            alert('Sucesso: Os dados foram removidos respeitando as travas de auditoria.');
            window.location.reload();
        }
        setLoading(false);
    }
}

  return (
    <div className="space-y-6 md:space-y-8 pb-20 md:pb-10">
      
      {/* HEADER */}
      <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <SettingsIcon className="text-slate-600"/> Configurações
          </h2>
          <p className="text-sm text-slate-500">Parâmetros gerais e gestão do sistema.</p>
      </div>

      {/* 1. Parâmetros Globais */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-purple-600 font-bold mb-4 flex items-center gap-2 text-sm md:text-base">
            <SettingsIcon size={18}/> Parâmetros Globais
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Valor Diário (VA)</label>
                <input type="number" step="0.01" className="w-full border p-2 rounded-lg text-black outline-none focus:ring-2 focus:ring-purple-500" 
                    value={formData.dailyValueVA} onChange={e => setFormData({...formData, dailyValueVA: Number(e.target.value)})} />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Valor Cesta</label>
                <input type="number" step="0.01" className="w-full border p-2 rounded-lg text-black outline-none focus:ring-2 focus:ring-purple-500" 
                    value={formData.basketValue} onChange={e => setFormData({...formData, basketValue: Number(e.target.value)})} />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Teto Salarial Cesta</label>
                <input type="number" step="0.01" className="w-full border p-2 rounded-lg text-black outline-none focus:ring-2 focus:ring-purple-500" 
                    value={formData.basketLimit} onChange={e => setFormData({...formData, basketLimit: Number(e.target.value)})} />
            </div>
            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Dias Úteis</label>
                    <input type="number" className="w-full border p-2 rounded-lg text-black outline-none focus:ring-2 focus:ring-purple-500" 
                        value={formData.businessDays} onChange={e => setFormData({...formData, businessDays: Number(e.target.value)})} />
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Dia Corte</label>
                    <input type="number" className="w-full border p-2 rounded-lg text-black outline-none focus:ring-2 focus:ring-purple-500" 
                        value={formData.cutoffDay} onChange={e => setFormData({...formData, cutoffDay: Number(e.target.value)})} />
                </div>
            </div>
        </div>
        <div className="flex justify-end mt-6">
            <button onClick={handleSaveGlobal} disabled={loading} className="w-full md:w-auto bg-purple-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-purple-700 transition flex items-center justify-center gap-2 shadow-sm active:scale-95">
                <Save size={18}/> {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
        </div>
      </div>

      {/* 2. Gestão de Períodos */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
         <h3 className="text-indigo-600 font-bold mb-4 flex items-center gap-2 text-sm md:text-base">
            <Calendar size={18}/> Gestão de Períodos
         </h3>
         <div className="max-h-60 overflow-y-auto pr-1">
            {/* Lista Mobile/Desktop Unificada (Lista Vertical é melhor aqui) */}
            <div className="space-y-2">
                {periods.map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div>
                            <div className="font-bold text-slate-700">{p.name || p.id}</div>
                            <div className="text-xs text-slate-400">Dias Úteis: {p.working_days || '-'}</div>
                        </div>
                        <button 
                            onClick={() => handleTogglePeriod(p.id, p.is_open)} 
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition ${p.is_open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                        >
                            {p.is_open ? <Unlock size={14}/> : <Lock size={14}/>}
                            {p.is_open ? 'ABERTO' : 'FECHADO'}
                        </button>
                    </div>
                ))}
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 3. Secretarias */}
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
             <h3 className="text-blue-600 font-bold mb-4 flex items-center gap-2 text-sm md:text-base">
                <Building size={18}/> Secretarias
             </h3>
             <div className="flex gap-2 mb-4">
                <input placeholder="NOVA SECRETARIA" className="flex-1 border p-2 rounded-lg uppercase text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                    value={newDept} onChange={e => setNewDept(e.target.value)} />
                <button onClick={() => handleListAction('departments', 'ADD', { name: newDept })} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"><Plus/></button>
             </div>
             <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {departments.map((d: any) => (
                    <div key={d.id} className="flex justify-between items-center p-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0">
                        <span className="text-sm font-medium text-slate-700">{d.name}</span>
                        <div className="flex gap-2">
                            <button onClick={() => handleListAction('departments', 'TOGGLE', { id: d.id, currentStatus: d.status })}
                                className={`p-1.5 rounded transition ${d.status === 'ATIVO' ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}>
                                {d.status === 'ATIVO' ? <ToggleRight size={20}/> : <ToggleLeft size={20}/>}
                            </button>
                            <button onClick={() => handleListAction('departments', 'DELETE', { id: d.id })} className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                        </div>
                    </div>
                ))}
             </div>
          </div>

          {/* 4. Filiais */}
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
             <h3 className="text-orange-600 font-bold mb-4 flex items-center gap-2 text-sm md:text-base">
                <MapPin size={18}/> Filiais
             </h3>
             <div className="flex gap-2 mb-4">
                <input placeholder="NOVA FILIAL" className="flex-1 border p-2 rounded-lg uppercase text-sm outline-none focus:ring-2 focus:ring-orange-500" 
                    value={newLoc} onChange={e => setNewLoc(e.target.value)} />
                <button onClick={() => handleListAction('locations', 'ADD', { name: newLoc })} className="bg-orange-600 text-white p-2 rounded-lg hover:bg-orange-700"><Plus/></button>
             </div>
             <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {locations.map((l: any) => (
                    <div key={l.id} className="flex justify-between items-center p-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0">
                        <span className="text-sm font-medium text-slate-700">{l.name}</span>
                        <div className="flex gap-2">
                            <button onClick={() => handleListAction('locations', 'TOGGLE', { id: l.id, currentStatus: l.status })}
                                className={`p-1.5 rounded transition ${l.status === 'ATIVO' ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}>
                                {l.status === 'ATIVO' ? <ToggleRight size={20}/> : <ToggleLeft size={20}/>}
                            </button>
                            <button onClick={() => handleListAction('locations', 'DELETE', { id: l.id })} className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                        </div>
                    </div>
                ))}
             </div>
          </div>
      </div>

      {/* 5. Status */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
         <h3 className="text-slate-600 font-bold mb-4 flex items-center gap-2 text-sm md:text-base">
            <List size={18}/> Status de Funcionários
         </h3>
         <div className="flex gap-2 mb-4 max-w-md">
            <button onClick={() => handleOpenStatusModal()} className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 font-semibold flex items-center gap-2 transition">
              <Plus size={18}/>
              Novo Status com Regras
            </button>
         </div>
         <div className="max-h-48 overflow-y-auto space-y-1 pr-1 border-t border-slate-100 pt-2">
            {statuses.map((s: any) => (
                <div key={s.id} className="flex justify-between items-center p-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 rounded-lg group">
                    <div className="flex-1">
                      <span className="text-sm text-slate-700 font-medium">{s.name}</span>
                      {s.description && (
                        <div className="text-xs text-slate-500">{s.description}</div>
                      )}
                      {s.exclusion_type && (
                        <div className="text-xs text-orange-600 font-semibold">
                          {s.exclusion_type === 'TOTAL' ? '🔴 Exclusão Total' : `🟠 ${s.exclusion_percentage}% Exclusão`}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => handleOpenStatusModal(s)} className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition">
                          <Edit size={16}/>
                        </button>
                        <button onClick={() => handleListAction('employee_statuses', 'TOGGLE', { id: s.id, currentStatus: s.status })}
                            className={`p-1.5 rounded transition ${s.status === 'ATIVO' ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}>
                            {s.status === 'ATIVO' ? <ToggleRight size={20}/> : <ToggleLeft size={20}/>}
                        </button>
                        <button onClick={() => handleListAction('employee_statuses', 'DELETE', { id: s.id })} className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                    </div>
                </div>
            ))}
         </div>
      </div>

      {/* Status Rules Modal */}
      <StatusRulesModal 
        isOpen={statusModalOpen}
        status={selectedStatus}
        onClose={() => {
          setStatusModalOpen(false)
          setSelectedStatus(null)
        }}
        onSave={handleSaveStatus}
        isLoading={loading}
      />

      {/* 6. Ações do Sistema */}
      <div className="bg-orange-50 p-4 md:p-6 rounded-xl border border-orange-200">
         <h3 className="text-orange-800 font-bold mb-2 flex items-center gap-2 text-sm md:text-base">
            <AlertTriangle size={20}/> Zona de Perigo / Manutenção
         </h3>
         <p className="text-orange-700 text-xs md:text-sm mb-6">Ações irreversíveis. O histórico aprovado é preservado.</p>
         
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm flex flex-col justify-between">
                <div>
                    <div className="font-bold text-slate-800 mb-2 flex items-center gap-2 text-sm"><Database size={16}/> Funcionários</div>
                    <p className="text-xs text-slate-500 mb-4">Limpa toda a base de cadastro.</p>
                </div>
                <button onClick={() => handleReset('EMPLOYEES')} className="w-full border border-red-200 text-red-600 font-bold text-xs py-2.5 rounded-lg hover:bg-red-50 flex items-center justify-center gap-2 transition">
                    <Trash2 size={14}/> RESETAR
                </button>
            </div>
            <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm flex flex-col justify-between">
                <div>
                    <div className="font-bold text-slate-800 mb-2 flex items-center gap-2 text-sm"><FileX size={16}/> Faltas</div>
                    <p className="text-xs text-slate-500 mb-4">Remove todas as faltas não aprovadas.</p>
                </div>
                <button onClick={() => handleReset('ABSENCES')} className="w-full border border-orange-300 text-orange-600 font-bold text-xs py-2.5 rounded-lg hover:bg-orange-50 flex items-center justify-center gap-2 transition">
                    <Trash2 size={14}/> RESETAR
                </button>
            </div>
            <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm flex flex-col justify-between">
                <div>
                    <div className="font-bold text-slate-800 mb-2 flex items-center gap-2 text-sm"><RefreshCw size={16}/> Cálculos</div>
                    <p className="text-xs text-slate-500 mb-4">Zera resultados pendentes.</p>
                </div>
                <button onClick={() => handleReset('CALCULATION')} className="w-full border border-orange-300 text-orange-600 font-bold text-xs py-2.5 rounded-lg hover:bg-orange-50 flex items-center justify-center gap-2 transition">
                    <RefreshCw size={14}/> RESETAR
                </button>
            </div>
            <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm flex flex-col justify-between">
            <div>
                    <div className="font-bold text-slate-800 mb-2 flex items-center gap-2 text-sm">
                        <List size={16}/> Ajustes Financeiros
                    </div>
                    <p className="text-xs text-slate-500 mb-4">Remove ajustes do período aberto atual.</p>
                </div>
                <button 
                    onClick={() => handleReset('ADJUSTMENTS')} 
                    disabled={loading}
                    className="w-full border border-orange-300 text-orange-600 font-bold text-xs py-2.5 rounded-lg hover:bg-orange-50 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                    <Trash2 size={14}/> {loading ? 'PROCESSANDO...' : 'RESETAR AJUSTES'}
                </button>
            </div>
         </div>
      </div>
    </div>
  )
}