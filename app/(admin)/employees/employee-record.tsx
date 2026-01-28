/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
    X, Calendar, User, History, AlertCircle, FileText, Loader2, 
    CreditCard, Building2, MapPin, Pencil, Save, RotateCcw, DollarSign, 
    CalendarClock, AlertTriangle, ChevronLeft, ChevronRight 
} from 'lucide-react'
import { getEmployeeRecordData } from '@/app/actions/record'
import { saveEmployee } from '@/app/actions/employees'
import { format, parseISO, isValid, differenceInBusinessDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface EmployeeRecordProps {
  isOpen: boolean
  onClose: () => void
  employeeId: string 
  departments: any[] 
  locations: any[]   
  currentUser: string
  globalConfig?: any
}

function formatarCPF(cpf: string) {
  if (!cpf) return '';
  cpf = cpf.replace(/\D/g, '');
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export default function EmployeeRecord({ isOpen, onClose, employeeId, departments, locations, currentUser, globalConfig }: EmployeeRecordProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'movements' | 'absences'>('info')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Dados de visualização
  const [data, setData] = useState<{ employee: any, movements: any[], absences: any[] }>({ employee: null, movements: [], absences: [] })
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  // Controle de Edição
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<any>(null)

  // Controle de Paginação
  const [itemsPerPage, setItemsPerPage] = useState(10) // Padrão mobile
  const [movementsPage, setMovementsPage] = useState(1)
  const [absencesPage, setAbsencesPage] = useState(1)

  // Detecta tamanho da tela para definir itens por página
  useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(window.innerWidth >= 768 ? 20 : 10)
    }
    
    // Executa na montagem e no resize
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Carrega dados ao abrir (Memoized)
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
        const res = await getEmployeeRecordData(employeeId)
        setData(res)
        // Prepara o form com os dados frescos
        if (res.employee) {
            setFormData({
                id: res.employee.id,
                name: res.employee.name,
                cpf: res.employee.cpf,
                role: res.employee.role,
                salary: res.employee.salary,
                department: res.employee.department_id,
                location: res.employee.location_id,
                status: res.employee.status,
                admissionDate: res.employee.admission_date || '',
                birthDate: res.employee.birth_date || '',
                statusStartDate: res.employee.status_start_date || '',
                statusEndDate: res.employee.status_end_date || ''
            })
        }
    } catch (error) {
        console.error(error)
    } finally {
        setLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    if (isOpen && employeeId) {
      loadData()
      // Reseta páginas ao abrir
      setMovementsPage(1)
      setAbsencesPage(1)
    }
  }, [isOpen, employeeId, loadData])

  // Reseta a página de faltas quando muda o mês
  useEffect(() => {
    setAbsencesPage(1)
  }, [selectedMonth])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
        const res = await saveEmployee(formData, currentUser || 'Admin', true)
        if (res.error) {
            alert('Erro: ' + res.error)
        } else {
            alert('Dados atualizados com sucesso!')
            setIsEditing(false)
            loadData() 
        }
    } catch (err) {
        alert('Erro ao salvar.')
    } finally {
        setSaving(false)
    }
  }

  // Helpers
  const formatDate = (date: string) => date ? format(parseISO(date), 'dd/MM/yyyy') : '-'
  const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  const STATUS_TEMPORARIOS = ["AFASTADO INSS", "AFASTADO DOENCA", "FERIAS", "MATERNIDADE"]

  const calculateImpact = () => {
    if (!formData || !STATUS_TEMPORARIOS.includes(formData.status) || !formData.statusStartDate || !formData.statusEndDate) return null
    const start = parseISO(formData.statusStartDate)
    const end = parseISO(formData.statusEndDate)
    if (!isValid(start) || !isValid(end)) return null;
    if (end < start) return null;
    const businessDaysOff = differenceInBusinessDays(end, start) + 1; 
    const dailyVa = Number(globalConfig?.daily_value_va || 0);
    const vaLoss = businessDaysOff * dailyVa;
    return { days: businessDaysOff, vaLoss: vaLoss }
  }
  const impact = calculateImpact()

  if (!isOpen) return null

  // Loading State
  if (loading && !data.employee) {
      return (
        <div className="fixed inset-0 bg-slate-900/80 flex flex-col items-center justify-center z-60 backdrop-blur-sm text-white">
            <Loader2 className="animate-spin mb-2" size={48} />
            <p className="text-sm font-medium animate-pulse">Carregando prontuário...</p>
        </div>
      )
  }

  if (!data.employee) return null

  const emp = data.employee
  
  // --- LÓGICA DE PAGINAÇÃO ---
  
  // 1. Faltas
  const filteredAbsences = data.absences.filter(a => a.date.startsWith(selectedMonth))
  const totalAbsencesPages = Math.ceil(filteredAbsences.length / itemsPerPage)
  const paginatedAbsences = filteredAbsences.slice((absencesPage - 1) * itemsPerPage, absencesPage * itemsPerPage)

  // 2. Movimentações
  const totalMovementsPages = Math.ceil(data.movements.length / itemsPerPage)
  const paginatedMovements = data.movements.slice((movementsPage - 1) * itemsPerPage, movementsPage * itemsPerPage)


  return (
    // Container Principal: Fullscreen no mobile, Modal centralizado no Desktop
    <div className="fixed inset-0 z-60 flex items-end md:items-center justify-center md:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Card do Prontuário */}
      <div className="bg-white w-full h-full md:h-[90vh] md:max-w-4xl md:rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
        
        {/* --- HEADER --- */}
        <div className="bg-slate-900 text-white p-4 md:p-6 shrink-0 flex justify-between items-start relative overflow-hidden">
            {/* Elemento decorativo de fundo */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <div className="flex gap-3 md:gap-5 items-center relative z-10 w-full pr-10"> {/* pr-10 para não sobrepor o botão de fechar */}
                {/* Avatar */}
                <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-full flex items-center justify-center text-lg md:text-xl font-bold border-2 md:border-4 border-slate-800 shadow-lg shrink-0">
                    {emp.name.substring(0,2).toUpperCase()}
                </div>
                
                {/* Info Texto */}
                <div className="min-w-0"> {/* min-w-0 para truncate funcionar */}
                    <h2 className="text-lg md:text-2xl font-bold leading-tight truncate">{emp.name}</h2>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <p className="text-slate-400 text-xs md:text-sm font-mono">Mat: {emp.id}</p>
                        <div className="flex gap-1.5 md:gap-2">
                             <span className="text-[10px] bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider text-slate-300">{emp.role}</span>
                             <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${emp.status === 'ATIVO' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>{emp.status}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ações Topo (Fechar) */}
            <button onClick={onClose} className="absolute top-3 right-3 p-2 bg-white/5 hover:bg-white/10 rounded-full transition z-20">
                <X size={20} className="text-white/80"/>
            </button>
        </div>

        {/* --- MENU DE ABAS (TABS) --- */}
        {!isEditing && (
            <div className="flex border-b border-slate-200 bg-white shrink-0 sticky top-0 z-10">
                <button onClick={() => setActiveTab('info')} className={`flex-1 py-3 md:py-4 flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 text-[10px] md:text-sm font-bold border-b-2 transition select-none ${activeTab === 'info' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                    <User size={18} className={activeTab === 'info' ? 'text-blue-600' : 'text-slate-400'}/> <span>Dados</span>
                </button>
                <button onClick={() => setActiveTab('absences')} className={`flex-1 py-3 md:py-4 flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 text-[10px] md:text-sm font-bold border-b-2 transition select-none ${activeTab === 'absences' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                    <Calendar size={18} className={activeTab === 'absences' ? 'text-blue-600' : 'text-slate-400'}/> <span>Faltas</span>
                </button>
                <button onClick={() => setActiveTab('movements')} className={`flex-1 py-3 md:py-4 flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 text-[10px] md:text-sm font-bold border-b-2 transition select-none ${activeTab === 'movements' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                    <History size={18} className={activeTab === 'movements' ? 'text-blue-600' : 'text-slate-400'}/> <span>Histórico</span>
                </button>
            </div>
        )}

        {/* --- ÁREA DE CONTEÚDO SCROLLÁVEL --- */}
        <div className="flex-1 overflow-y-auto bg-slate-50 pb-safe"> {/* pb-safe para iPhones */}
            <div className="p-4 md:p-6 space-y-4">
            
            {/* MODO DE EDIÇÃO */}
            {isEditing ? (
                <form onSubmit={handleSave} className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-2 pb-3 border-b border-slate-100">
                        <h3 className="font-bold text-slate-800 text-base md:text-lg flex items-center gap-2"><Pencil size={18} className="text-blue-600"/> Editar Dados</h3>
                        <button type="button" onClick={() => setIsEditing(false)} className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition flex items-center gap-1">
                            <RotateCcw size={14}/> <span className="hidden sm:inline">Cancelar</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-1 space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label><input required className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                        <div className="col-span-1 space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">CPF</label><input required className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} /></div>
                        
                        <div className="col-span-1 space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Cargo</label><input required className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} /></div>
                        
                        <div className="col-span-1 space-y-1">
                             <label className="text-xs font-bold text-slate-500 uppercase">Salário Base</label>
                             <div className="relative">
                                <DollarSign size={16} className="absolute left-3 top-3 text-slate-400"/>
                                <input type="number" step="0.01" required className="w-full border border-slate-300 p-2.5 pl-9 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" value={formData.salary} onChange={e => setFormData({...formData, salary: parseFloat(e.target.value)})} />
                             </div>
                        </div>

                        <div className="col-span-1 space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Secretaria</label>
                            <select required className="w-full border border-slate-300 p-2.5 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                                {departments.map((d:any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        
                        <div className="col-span-1 space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Filial</label>
                            <select required className="w-full border border-slate-300 p-2.5 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}>
                                {locations.map((l:any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>

                        <div className="col-span-1 space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Admissão</label><input type="date" className="w-full border border-slate-300 p-2.5 rounded-lg bg-white" value={formData.admissionDate} onChange={e => setFormData({...formData, admissionDate: e.target.value})} /></div>
                        <div className="col-span-1 space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Nascimento</label><input type="date" className="w-full border border-slate-300 p-2.5 rounded-lg bg-white" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} /></div>

                        <div className="col-span-1 md:col-span-2 border-t border-slate-100 pt-4 space-y-1">
                             <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                             <select className="w-full border border-slate-300 p-2.5 rounded-lg bg-white font-medium focus:ring-2 focus:ring-blue-500 outline-none transition" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                <option value="ATIVO">ATIVO</option>
                                <option value="INATIVO">INATIVO</option>
                                <option value="MENOR APRENDIZ">MENOR APRENDIZ</option>
                                <option value="AFASTADO INSS">AFASTADO INSS</option>
                                <option value="AFASTADO DOENCA">AFASTADO DOENCA</option>
                                <option value="FERIAS">FERIAS</option>
                                <option value="MATERNIDADE">MATERNIDADE</option>
                                <option value="DEMITIDO">DEMITIDO</option>
                            </select>
                        </div>

                        {STATUS_TEMPORARIOS.includes(formData.status) && (
                            <div className="col-span-1 md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><CalendarClock size={16} className="text-blue-600"/> Período do Evento</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><label className="block text-[10px] uppercase font-bold text-slate-400">Início</label><input type="date" value={formData.statusStartDate} onChange={(e) => setFormData({...formData, statusStartDate: e.target.value})} className="block w-full border p-2 rounded-lg bg-white" /></div>
                                    <div className="space-y-1"><label className="block text-[10px] uppercase font-bold text-slate-400">Fim</label><input type="date" value={formData.statusEndDate} onChange={(e) => setFormData({...formData, statusEndDate: e.target.value})} className="block w-full border p-2 rounded-lg bg-white" /></div>
                                </div>
                                {impact && (
                                    <div className="mt-3 p-3 bg-orange-50 border border-orange-100 rounded-lg text-xs md:text-sm text-orange-900 flex flex-col gap-1">
                                        <p className="font-bold flex items-center gap-2"><AlertTriangle size={14} className="text-orange-600" /> Impacto Financeiro</p>
                                        <p>• Ausência: <strong>{impact.days} dias úteis</strong>.</p>
                                        <p>• Desc. VA: <strong>{formatMoney(impact.vaLoss)}</strong></p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-3 text-slate-600 font-bold border border-slate-200 rounded-xl hover:bg-slate-50 transition">Cancelar</button>
                        <button type="submit" disabled={saving} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 shadow-lg flex items-center justify-center gap-2 disabled:opacity-70">
                            {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Salvar
                        </button>
                    </div>
                </form>
            ) : (
                <>
                    {/* TAB 1: DADOS (LEITURA) */}
                    {activeTab === 'info' && (
                        <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Botão de Editar Flutuante (Mobile Only) */}
                            <div className="flex justify-end md:hidden mb-2">
                                <button onClick={() => { setIsEditing(true); }} className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg flex items-center gap-2 w-full justify-center border border-blue-100">
                                    <Pencil size={16}/> Editar Informações
                                </button>
                            </div>

                            {/* Cards Resumo */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                                <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                                    <div className="bg-green-100 p-2 md:p-2.5 rounded-lg text-green-600 shrink-0"><CreditCard size={20}/></div>
                                    <div className="min-w-0"><p className="text-[10px] md:text-xs text-slate-500 uppercase font-bold truncate">Salário Base</p><p className="font-bold text-slate-800 text-sm md:text-base">{formatMoney(emp.salary)}</p></div>
                                </div>
                                <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                                    <div className="bg-blue-100 p-2 md:p-2.5 rounded-lg text-blue-600 shrink-0"><Building2 size={20}/></div>
                                    <div className="min-w-0"><p className="text-[10px] md:text-xs text-slate-500 uppercase font-bold truncate">Secretaria</p><p className="font-bold text-slate-800 text-sm md:text-base truncate">{emp.department_id}</p></div>
                                </div>
                                <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                                    <div className="bg-purple-100 p-2 md:p-2.5 rounded-lg text-purple-600 shrink-0"><MapPin size={20}/></div>
                                    <div className="min-w-0"><p className="text-[10px] md:text-xs text-slate-500 uppercase font-bold truncate">Filial</p><p className="font-bold text-slate-800 text-sm md:text-base truncate">{emp.location_id}</p></div>
                                </div>
                            </div>

                            {/* Detalhes Completos */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm md:text-base"><FileText size={18} className="text-slate-400"/> Ficha Cadastral</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                                    <div className="pb-2 border-b border-slate-50"><span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Nome Completo</span><span className="text-slate-800 font-medium text-sm md:text-base block">{emp.name}</span></div>
                                    <div className="pb-2 border-b border-slate-50"><span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">CPF</span><span className="text-slate-800 font-medium text-sm md:text-base block">{formatarCPF(emp.cpf) || '-'}</span></div>
                                    <div className="pb-2 border-b border-slate-50"><span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Data de Nascimento</span><span className="text-slate-800 font-medium text-sm md:text-base block">{formatDate(emp.birth_date)}</span></div>
                                    <div className="pb-2 border-b border-slate-50"><span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Data de Admissão</span><span className="text-slate-800 font-medium text-sm md:text-base block">{formatDate(emp.admission_date)}</span></div>
                                    <div className="pb-2 border-b border-slate-50"><span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Cargo</span><span className="text-slate-800 font-medium text-sm md:text-base block">{emp.role}</span></div>
                                    <div className="pb-2 border-b border-slate-50"><span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Status Atual</span><span className="text-slate-800 font-medium text-sm md:text-base block">{emp.status}</span></div>
                                    
                                    {emp.status_start_date && (
                                        <div className="col-span-1 md:col-span-2 bg-orange-50 p-3 rounded-lg border border-orange-100 mt-2">
                                            <p className="text-[10px] font-bold text-orange-800 uppercase mb-1">Afastamento / Status</p>
                                            <p className="text-xs md:text-sm text-orange-900">De <b>{formatDate(emp.status_start_date)}</b> até <b>{formatDate(emp.status_end_date)}</b></p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Botão de Edição Desktop */}
                            <div className="hidden md:flex justify-end">
                                <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition">
                                    <Pencil size={16}/> Editar Dados
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: FALTAS (LEITURA) */}
                    {activeTab === 'absences' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-red-100 p-2 rounded-lg text-red-600"><AlertCircle size={20}/></div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-sm md:text-base">Controle de Faltas</h3>
                                        <p className="text-[10px] md:text-xs text-slate-500">Filtre por mês</p>
                                    </div>
                                </div>
                                <input 
                                    type="month" 
                                    value={selectedMonth} 
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="w-full sm:w-auto border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                                />
                             </div>

                             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                {filteredAbsences.length === 0 ? (
                                    <div className="p-8 md:p-10 text-center text-slate-400 flex flex-col items-center">
                                        <Calendar size={40} className="mb-2 opacity-20"/>
                                        <p className="text-sm">Nenhuma falta em {format(parseISO(selectedMonth + '-01'), 'MMMM/yyyy', { locale: ptBR })}.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm text-slate-600">
                                                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                                                    <tr>
                                                        <th className="px-4 py-3 whitespace-nowrap">Data</th>
                                                        <th className="px-4 py-3 whitespace-nowrap">Tipo</th>
                                                        <th className="px-4 py-3 min-w-37.5">Motivo</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {paginatedAbsences.map(absence => (
                                                        <tr key={absence.id} className="hover:bg-slate-50/50">
                                                            <td className="px-4 py-3 font-mono font-medium text-slate-700 whitespace-nowrap">{formatDate(absence.date)}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${absence.type === 'INJUSTIFICADA' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                    {absence.type}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-500 text-xs md:text-sm">{absence.reason}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {/* Paginação Faltas */}
                                        {totalAbsencesPages > 1 && (
                                            <div className="flex justify-between items-center p-3 border-t border-slate-100 bg-slate-50 text-xs md:text-sm">
                                                <button onClick={() => setAbsencesPage(p => Math.max(1, p - 1))} disabled={absencesPage === 1} className="p-2 border rounded hover:bg-white disabled:opacity-50"><ChevronLeft size={16}/></button>
                                                <span className="text-slate-500">Pág {absencesPage} de {totalAbsencesPages}</span>
                                                <button onClick={() => setAbsencesPage(p => Math.min(totalAbsencesPages, p + 1))} disabled={absencesPage === totalAbsencesPages} className="p-2 border rounded hover:bg-white disabled:opacity-50"><ChevronRight size={16}/></button>
                                            </div>
                                        )}
                                    </div>
                                )}
                             </div>
                        </div>
                    )}

                    {/* TAB 3: MOVIMENTAÇÕES (LEITURA) */}
                    {activeTab === 'movements' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
                            <h3 className="font-bold text-slate-800 ml-1 text-sm md:text-base">Linha do Tempo</h3>
                            <div className="relative border-l-2 border-slate-200 ml-3 md:ml-4 space-y-6 md:space-y-8 pb-4">
                                {data.movements.length === 0 ? (
                                    <p className="text-slate-400 text-xs md:text-sm ml-6 italic">Nenhum histórico de movimentação encontrado.</p>
                                ) : paginatedMovements.map((mov, idx) => (
                                    <div key={mov.id || idx} className="relative ml-5 md:ml-8">
                                        {/* Bolinha da timeline */}
                                        <div className="absolute -left-6.75d:-left-[39px] top-0 w-3 h-3 md:w-4 md:h-4 rounded-full bg-blue-500 border-2 md:border-4 border-white shadow-sm ring-1 ring-slate-100"></div>
                                        
                                        <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex flex-wrap justify-between items-start mb-2 gap-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 px-2 py-1 rounded text-slate-600">
                                                    {mov.type.replace('_', ' ')}
                                                </span>
                                                <span className="text-[10px] md:text-xs text-slate-400 font-mono">
                                                    {format(new Date(mov.created_at), "dd/MM/yy HH:mm")}
                                                </span>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 gap-2 mt-3">
                                                {mov.old_value && (
                                                    <div className="text-xs md:text-sm">
                                                        <p className="text-[10px] font-bold text-red-400 uppercase mb-0.5">Anterior</p>
                                                        <p className="bg-red-50 text-red-800 p-2 rounded border border-red-100 wrap-break-word">{mov.old_value}</p>
                                                    </div>
                                                )}
                                                <div className="text-xs md:text-sm">
                                                    <p className="text-[10px] font-bold text-green-500 uppercase mb-0.5">Novo / Atual</p>
                                                    <p className="bg-green-50 text-green-800 p-2 rounded border border-green-100 wrap-break-word">{mov.new_value}</p>
                                                </div>
                                            </div>
                                            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] md:text-xs text-slate-400">
                                                <User size={10} className="md:w-3 md:h-3"/> <span>Por: <span className="font-bold text-slate-600">{mov.user_name || 'Sistema'}</span></span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Paginação Movimentações */}
                            {totalMovementsPages > 1 && (
                                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-xs md:text-sm">
                                    <button onClick={() => setMovementsPage(p => Math.max(1, p - 1))} disabled={movementsPage === 1} className="p-2 border rounded hover:bg-slate-50 disabled:opacity-50"><ChevronLeft size={16}/></button>
                                    <span className="text-slate-500">Pág {movementsPage} de {totalMovementsPages}</span>
                                    <button onClick={() => setMovementsPage(p => Math.min(totalMovementsPages, p + 1))} disabled={movementsPage === totalMovementsPages} className="p-2 border rounded hover:bg-slate-50 disabled:opacity-50"><ChevronRight size={16}/></button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            </div>
        </div>
      </div>
    </div>
  )
}