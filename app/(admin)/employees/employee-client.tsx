/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useRef } from 'react'
import { saveEmployee, deleteEmployee, importEmployeesBatch, updateStatusBatch } from '@/app/actions/employees'
import { 
  Plus, Search, Trash2, Pencil, Upload, Download, X, UserPlus, Loader2,
  ChevronLeft, ChevronRight, CalendarClock, AlertTriangle, ShoppingBasket,
  Building2, MapPin, Briefcase, DollarSign, Users, Filter, ArrowUpDown, Check,
  SlidersHorizontal, XCircle, RotateCcw
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { differenceInBusinessDays, parseISO, isValid } from 'date-fns'
import EmployeeRecord from './employee-record'

// Hook simples para fechar dropdowns ao clicar fora
function useOnClickOutside(ref: any, handler: any) {
  useEffect(() => {
    const listener = (event: any) => {
      if (!ref.current || ref.current.contains(event.target)) return
      handler(event)
    }
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler])
}

export default function EmployeeClient({ initialEmployees, departments, locations, statuses, user, globalConfig }: any) {
  // --- ESTADOS DE DADOS ---
  const [employees, setEmployees] = useState(initialEmployees)
  const [filteredEmployees, setFilteredEmployees] = useState(initialEmployees)
  const [selectedEmployeeRecord, setSelectedEmployeeRecord] = useState<any>(null)
  
  // --- ESTADOS DE UI E PAGINAÇÃO ---
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [search, setSearch] = useState('')
  const [showBasketOnly, setShowBasketOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // --- MODAIS ---
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false)
  const [bulkType, setBulkType] = useState<'DEMISSAO' | 'FERIAS'>('FERIAS')

  // --- FORM DATA ---
  const [formData, setFormData] = useState({
    id: '', name: '', cpf: '', role: '', salary: 0, 
    department: '', location: '', status: 'ATIVO',
    admissionDate: '', birthDate: '',
    statusStartDate: '', statusEndDate: ''
  })

  // --- CONFIGURAÇÃO DE FILTROS E ORDENAÇÃO ---
  const [openFilter, setOpenFilter] = useState<string | null>(null)
  const filterRef = useRef<HTMLDivElement>(null)
  
  useOnClickOutside(filterRef, () => setOpenFilter(null))

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({
    key: 'name', direction: 'asc'
  })

  const [filters, setFilters] = useState({
    roles: [] as string[],
    departments: [] as string[],
    locations: [] as string[],
    statuses: [] as string[]
  })

  // Listas únicas para os dropdowns
  const uniqueRoles = Array.from(new Set(employees.map((e: any) => e.role))).sort() as string[]
  const uniqueStatuses = Array.from(new Set(employees.map((e: any) => e.status))).sort() as string[]

  // Verifica se há filtros ativos
  const hasActiveFilters = search !== '' || showBasketOnly || 
                           filters.roles.length > 0 || filters.departments.length > 0 || 
                           filters.locations.length > 0 || filters.statuses.length > 0

  // --- CONSTANTES ---
  const BASKET_LIMIT = Number(globalConfig?.basket_limit) || 1780.00
  const eligibleForBasketCount = employees.filter((e: any) => 
    e.status === 'ATIVO' && Number(e.salary) <= BASKET_LIMIT
  ).length
  // Status temporários são aqueles que têm datas de início e fim
  const STATUS_TEMPORARIOS = statuses
    .filter((s: any) => s.start_date || s.end_date)
    .map((s: any) => s.name) || ["AFASTADO INSS", "AFASTADO DOENCA", "FERIAS", "MATERNIDADE"]

  // --- EFEITOS (FILTRAGEM E ORDENAÇÃO) ---
  useEffect(() => {
    let result = [...employees]

    // 1. Busca por texto
    if (search) {
      const s = search.toLowerCase()
      result = result.filter((e: any) => 
        e.name.toLowerCase().includes(s) || e.id.includes(s)
      )
    }

    // 2. Filtro de Cesta Básica
    if (showBasketOnly) {
      result = result.filter((e: any) => Number(e.salary) <= BASKET_LIMIT && e.status === 'ATIVO')
    }

    // 3. Filtros Avançados
    if (filters.roles.length > 0) result = result.filter((e: any) => filters.roles.includes(e.role))
    if (filters.statuses.length > 0) result = result.filter((e: any) => filters.statuses.includes(e.status))
    if (filters.departments.length > 0) result = result.filter((e: any) => filters.departments.includes(e.department_id))
    if (filters.locations.length > 0) result = result.filter((e: any) => filters.locations.includes(e.location_id))

    // 4. Ordenação
    result.sort((a: any, b: any) => {
      let valA, valB

      if (sortConfig.key === 'admission_date') {
        valA = a.admission_date ? new Date(a.admission_date).getTime() : 0
        valB = b.admission_date ? new Date(b.admission_date).getTime() : 0
      } else if (sortConfig.key === 'salary') {
        valA = Number(a.salary)
        valB = Number(b.salary)
      } else {
        valA = a[sortConfig.key] || ''
        valB = b[sortConfig.key] || ''
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    setFilteredEmployees(result)
    setCurrentPage(1)
  }, [employees, search, showBasketOnly, filters, sortConfig, BASKET_LIMIT])


  // --- FUNÇÕES DE CONTROLE ---
  const toggleFilter = (column: string) => setOpenFilter(openFilter === column ? null : column)

  const handleCheckboxFilter = (category: 'roles' | 'statuses' | 'departments' | 'locations', value: string) => {
    setFilters(prev => {
      const current = prev[category]
      const updated = current.includes(value) 
        ? current.filter(item => item !== value)
        : [...current, value]
      return { ...prev, [category]: updated }
    })
  }

  const clearFilterCategory = (category: 'roles' | 'statuses' | 'departments' | 'locations') => {
    setFilters(prev => ({ ...prev, [category]: [] }))
  }

  const clearAllFilters = () => {
    setSearch('')
    setShowBasketOnly(false)
    setFilters({ roles: [], departments: [], locations: [], statuses: [] })
    setSortConfig({ key: 'name', direction: 'asc' })
    setIsMobileFilterOpen(false)
  }

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    setSortConfig({ key, direction })
    setOpenFilter(null)
  }

  const resetSort = () => {
    setSortConfig({ key: 'name', direction: 'asc' })
    setOpenFilter(null)
  }

  // --- IMPACTO FINANCEIRO ---
  const calculateImpact = () => {
    if (!STATUS_TEMPORARIOS.includes(formData.status) || !formData.statusStartDate || !formData.statusEndDate) return null
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

  // --- UTILITÁRIOS ---
  const excelDateToISO = (val: any) => {
    if (!val || val === '' || val === '-') return null
    try {
        if (typeof val === 'number') {
            const date = new Date(Math.round((val - 25569) * 86400 * 1000))
            return date.toISOString().split('T')[0]
        }
        if (typeof val === 'string') {
            if (val.includes('/')) {
                const parts = val.trim().split('/') 
                if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
            }
            if (val.includes('-')) return val.trim() 
        }
    } catch (e) { return null }
    return null
  }

  const findEmployee = (row: any) => {
      if (row['Matrícula'] || row['Matricula']) {
          const id = String(row['Matrícula'] || row['Matricula']).trim()
          const found = employees.find((e: any) => e.id === id)
          if (found) return found
      }
      if (row['CPF']) {
          const cpf = String(row['CPF']).replace(/\D/g, '')
          const found = employees.find((e: any) => e.cpf === cpf)
          if (found) return found
      }
      if (row['Nome'] || row['Nome Completo']) {
          const name = String(row['Nome'] || row['Nome Completo']).toUpperCase().trim()
          const found = employees.find((e: any) => e.name === name)
          if (found) return found
      }
      return null
  }

  const handleBulkUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    const file = e.target.files[0]
    e.target.value = '' 
    setLoading(true)
    setLoadingMessage('Analisando arquivo...')
    try {
        const data = await file.arrayBuffer()
        const workbook = XLSX.read(data)
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet)
        if (jsonData.length === 0) {
            alert('Arquivo vazio.')
            setLoading(false)
            return
        }
        const updates: any[] = []
        let notFoundCount = 0
        jsonData.forEach((row) => {
            const emp = findEmployee(row)
            if (emp) {
                const updateObj: any = { id: emp.id, name: emp.name, status: bulkType === 'DEMISSAO' ? 'DEMITIDO' : 'FERIAS' }
                if (bulkType === 'FERIAS') {
                    const start = excelDateToISO(row['Inicio'] || row['Início'] || row['Data Inicio'] || row['Start'])
                    const end = excelDateToISO(row['Fim'] || row['Data Fim'] || row['End'])
                    if (start && end) { updateObj.status_start_date = start; updateObj.status_end_date = end } else { return }
                } else if (bulkType === 'DEMISSAO') {
                    updateObj.status_start_date = null
                    updateObj.status_end_date = null
                }
                updates.push(updateObj)
            } else { notFoundCount++ }
        })
        if (updates.length === 0) {
            alert('Nenhum funcionário encontrado ou dados inválidos.')
            setLoading(false)
            return
        }
        if (confirm(`Serão atualizados ${updates.length} registros.\n${notFoundCount} não encontrados.\nDeseja continuar?`)) {
            setLoadingMessage(`Atualizando...`)
            const res = await updateStatusBatch(updates, user.email || 'Admin')
            if (res.errors && res.errors.length > 0) alert(`Concluído com erros.`)
            else alert('Sucesso!')
            window.location.reload()
        }
    } catch (err: any) { alert('Erro: ' + err.message) } finally { setLoading(false); setIsBulkModalOpen(false) }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    const file = e.target.files[0]
    e.target.value = '' 
    setLoading(true)
    setLoadingMessage('Lendo arquivo...')
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      let targetSheetName = workbook.SheetNames[0]
      let worksheet = workbook.Sheets[targetSheetName]
      let jsonData: any[] = XLSX.utils.sheet_to_json(worksheet)
      const hasMatricula = jsonData.length > 0 && ('Matrícula' in jsonData[0] || 'Matricula' in jsonData[0])
      if (!hasMatricula) {
        const modeloSheet = workbook.SheetNames.find(n => n.toLowerCase().includes('modelo'))
        if (modeloSheet) { targetSheetName = modeloSheet; worksheet = workbook.Sheets[targetSheetName]; jsonData = XLSX.utils.sheet_to_json(worksheet) }
      }
      setLoadingMessage(`Processando ${jsonData.length} linhas...`)
      const parsedEmployees = jsonData.map((row: any) => {
          return {
              id: String(row['Matrícula'] || row['Matricula'] || ''),
              name: row['Nome Completo'] || row['Nome'] || '',
              cpf: String(row['CPF'] || ''),
              role: row['Cargo'] || '',
              department: row['Secretaria'] || 'EDUCACAO',
              location: row['Filial'] || 'SEDE',
              salary: Number(row['Salário Base'] || row['Salário'] || 0),
              status: row['Status'] || 'ATIVO',
              admissionDate: excelDateToISO(row['Data de Admissão'] || row['Admissão']),
              birthDate: excelDateToISO(row['Data de Nascimento'] || row['Nascimento'])
          }
      })
      const validEmployees = parsedEmployees.filter((e: any) => e.id && e.id !== 'indefinido' && e.name)
      if (validEmployees.length === 0) { alert(`Erro: Nenhuma coluna "Matrícula" encontrada.`); setLoading(false); return }
      const res = await importEmployeesBatch(validEmployees, user.email || 'Admin')
      if (res.error) alert('Erro: ' + res.error)
      else { alert(`Sucesso! ${res.count} importados.`); window.location.reload() }
    } catch (err: any) { alert('Erro: ' + err.message) } finally { setLoading(false) }
  }

  const handleExport = () => {
    const dataToExport = filteredEmployees.map((e: any) => ({
      'Matrícula': e.id, 'Nome Completo': e.name, 'CPF': e.cpf, 'Cargo': e.role,
      'Secretaria': e.department_id, 'Filial': e.location_id, 'Salário Base': e.salary,
      'Status': e.status, 'Data de Admissão': e.admission_date, 'Data de Nascimento': e.birth_date
    }))
    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Funcionarios")
    XLSX.writeFile(wb, "Base_Funcionarios.xlsx")
  }

  const handleOpenNew = () => {
    setFormData({
        id: '', name: '', cpf: '', role: '', salary: 0, 
        department: departments[0]?.id || '', location: locations[0]?.id || '', status: 'ATIVO',
        admissionDate: '', birthDate: '', statusStartDate: '', statusEndDate: ''
    })
    setIsEditMode(false)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (emp: any) => {
    setFormData({
        id: emp.id, name: emp.name, cpf: emp.cpf, role: emp.role, salary: emp.salary,
        department: emp.department_id, location: emp.location_id, status: emp.status,
        admissionDate: emp.admission_date || '', birthDate: emp.birth_date || '',
        statusStartDate: emp.status_start_date || '', statusEndDate: emp.status_end_date || ''
    })
    setIsEditMode(true)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setLoadingMessage('Salvando...')
    const res = await saveEmployee(formData, user.email || 'Admin', isEditMode)
    if (res.error) alert('Erro: ' + res.error)
    else { alert(isEditMode ? 'Atualizado!' : 'Cadastrado!'); setIsModalOpen(false); window.location.reload() }
    setLoading(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Excluir ${name}?`)) {
        setLoading(true)
        const res = await deleteEmployee(id, name, user.email || 'Admin')
        if (res.error) alert(res.error)
        else window.location.reload()
        setLoading(false)
    }
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).slice(0, 2).join('').toUpperCase()
  }

  // Paginação
  const totalItems = filteredEmployees.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = filteredEmployees.slice(startIndex, endIndex)

  return (
    <div className="space-y-4 md:space-y-6 flex flex-col h-[calc(100dvh-3rem)]"> 
      
      {loading && (
        <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-50 text-white backdrop-blur-sm">
            <Loader2 size={48} className="animate-spin mb-4" />
            <p className="text-xl font-bold">{loadingMessage || 'Processando...'}</p>
        </div>
      )}

      {/* --- HEADER --- */}
      <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 shrink-0 px-2 md:px-0">
        <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">Base de Funcionários</h2>
            <p className="text-xs text-slate-500 hidden md:block">Gerencie admissões, dados e contratos.</p>
        </div>
        <div className="grid grid-cols-2 sm:flex flex-wrap gap-2">
            <button onClick={handleOpenNew} className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition text-sm font-bold shadow-sm">
                <Plus size={18} /> Novo
            </button>
            <button onClick={() => setIsBulkModalOpen(true)} className="flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm font-medium shadow-sm">
                <Users size={18} /> Atualizar Status
            </button>
            <label className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition text-sm font-medium shadow-sm">
                <Upload size={18} /> Importar
                <input type="file" className="hidden" accept=".xlsx" onChange={handleImport} disabled={loading} />
            </label>
             <button onClick={handleExport} className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition text-sm font-medium">
                <Download size={18} /> Exportar
            </button>
        </div>
      </div>

      {/* --- FILTROS RÁPIDOS --- */}
      <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3 md:gap-4 justify-between items-center shrink-0">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome ou matrícula..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="w-full md:w-auto flex gap-2 overflow-x-auto pb-1 md:pb-0">
            <button onClick={() => setIsMobileFilterOpen(true)} className="md:hidden flex items-center gap-2 px-4 py-2 rounded-lg border bg-slate-100 text-slate-700 font-medium whitespace-nowrap">
                <SlidersHorizontal size={18} /> Filtros {hasActiveFilters && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
            </button>
            <button onClick={() => setShowBasketOnly(!showBasketOnly)} className={`flex items-center gap-3 px-4 py-2 rounded-lg border transition whitespace-nowrap ${showBasketOnly ? 'bg-orange-50 border-orange-300 text-orange-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <div className={`p-1.5 rounded-full ${showBasketOnly ? 'bg-orange-200 text-orange-700' : 'bg-slate-100 text-slate-500'}`}><ShoppingBasket size={18} /></div>
                <div className="text-left leading-tight hidden sm:block"><span className="text-xs font-bold uppercase block">Recebem Cesta</span><span className="text-sm font-medium">{eligibleForBasketCount}</span></div>
                <span className="sm:hidden font-bold text-sm">Cesta ({eligibleForBasketCount})</span>
            </button>
            {hasActiveFilters && (
                <button onClick={clearAllFilters} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition whitespace-nowrap" title="Limpar todos os filtros">
                    <XCircle size={18} /> <span className="hidden sm:inline">Limpar</span>
                </button>
            )}
        </div>
      </div>

      {/* --- TABELA E LISTA --- */}
      <div className="bg-slate-50 md:bg-white md:rounded-xl md:shadow-sm md:border md:border-slate-200 flex flex-col flex-1 min-h-0 overflow-hidden relative">
        
        {/* DROPDOWN DE FILTROS DESKTOP */}
        {openFilter && (
            <div ref={filterRef} className="absolute z-50 bg-white rounded-lg shadow-xl border border-slate-200 w-64 p-3 animate-in fade-in zoom-in-95 duration-100"
                 style={{ 
                    top: '50px', 
                    left: openFilter === 'employee' ? '10px' : 
                          openFilter === 'details' ? '31%' : 
                          openFilter === 'location' ? '53%' : 
                          openFilter === 'salary' ? '65%' : 'auto', // Salário fixado em 60%
                    right: openFilter === 'status' ? '4%' : 'auto'
                 }}>
                
                {/* 1. FUNCIONÁRIO (Nome e Admissão) */}
                {openFilter === 'employee' && (
                    <div className="space-y-1">
                        <div className="flex justify-between items-center mb-2">
                             <p className="text-xs font-bold text-slate-400 uppercase">Ordenar Por</p>
                             {sortConfig.key !== 'name' && (
                                <button onClick={resetSort} className="text-[10px] text-red-500 hover:bg-red-50 px-2 py-0.5 rounded flex items-center gap-1">
                                    <RotateCcw size={10}/> Padrão
                                </button>
                             )}
                        </div>
                        {[
                           { label: 'Nome (A-Z)', key: 'name', dir: 'asc' }, { label: 'Nome (Z-A)', key: 'name', dir: 'desc' },
                           { label: 'Admissão (Antiga)', key: 'admission_date', dir: 'asc' }, { label: 'Admissão (Recente)', key: 'admission_date', dir: 'desc' },
                        ].map(opt => (
                            <button key={opt.label} onClick={() => handleSort(opt.key, opt.dir as any)} 
                                className={`w-full text-left px-3 py-2 rounded text-sm flex justify-between items-center ${sortConfig.key === opt.key && sortConfig.direction === opt.dir ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}>
                                {opt.label} {sortConfig.key === opt.key && sortConfig.direction === opt.dir && <Check size={14}/>}
                            </button>
                        ))}
                    </div>
                )}

                {/* 2. SALÁRIO */}
                {openFilter === 'salary' && (
                    <div className="space-y-1">
                        <div className="flex justify-between items-center mb-2">
                             <p className="text-xs font-bold text-slate-400 uppercase">Ordenar Salário</p>
                             {sortConfig.key === 'salary' && (
                                <button onClick={resetSort} className="text-[10px] text-red-500 hover:bg-red-50 px-2 py-0.5 rounded flex items-center gap-1">
                                    <RotateCcw size={10}/> Padrão
                                </button>
                             )}
                        </div>
                        {[
                           { label: 'Menor Salário', key: 'salary', dir: 'asc' }, { label: 'Maior Salário', key: 'salary', dir: 'desc' },
                        ].map(opt => (
                            <button key={opt.label} onClick={() => handleSort(opt.key, opt.dir as any)} 
                                className={`w-full text-left px-3 py-2 rounded text-sm flex justify-between items-center ${sortConfig.key === opt.key && sortConfig.direction === opt.dir ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}>
                                {opt.label} {sortConfig.key === opt.key && sortConfig.direction === opt.dir && <Check size={14}/>}
                            </button>
                        ))}
                    </div>
                )}

                {/* 3. CARGOS */}
                {openFilter === 'details' && (
                    <div className="flex flex-col max-h-64">
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase">Filtrar Cargos</span>
                            {filters.roles.length > 0 && (
                                <button onClick={() => clearFilterCategory('roles')} className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1 transition">
                                    <Trash2 size={12}/> Limpar
                                </button>
                            )}
                         </div>
                         <div className="overflow-y-auto space-y-1 pr-1 flex-1">
                            {uniqueRoles.map(role => (
                                <label key={role} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-sm text-slate-700">
                                    <input type="checkbox" checked={filters.roles.includes(role)} onChange={() => handleCheckboxFilter('roles', role)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                    <span className="truncate">{role}</span>
                                </label>
                            ))}
                         </div>
                    </div>
                )}

                {/* 4. LOCALIZAÇÃO */}
                {openFilter === 'location' && (
                    <div className="flex flex-col max-h-80 space-y-3">
                         <div>
                             <div className="flex justify-between items-center mb-1">
                                 <span className="text-xs font-bold text-slate-400 uppercase">Secretarias</span>
                                 {filters.departments.length > 0 && (
                                    <button onClick={() => clearFilterCategory('departments')} className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1 transition">
                                        <Trash2 size={12}/> Limpar
                                    </button>
                                 )}
                             </div>
                             <div className="max-h-32 overflow-y-auto border rounded p-1 space-y-1">
                                {departments.map((d: any) => (
                                    <label key={d.id} className="flex items-center gap-2 px-1 py-1 hover:bg-slate-50 rounded cursor-pointer text-xs text-slate-700">
                                        <input type="checkbox" checked={filters.departments.includes(d.id)} onChange={() => handleCheckboxFilter('departments', d.id)} />
                                        <span>{d.name}</span>
                                    </label>
                                ))}
                             </div>
                         </div>
                         <div>
                             <div className="flex justify-between items-center mb-1">
                                 <span className="text-xs font-bold text-slate-400 uppercase">Filiais</span>
                                 {filters.locations.length > 0 && (
                                    <button onClick={() => clearFilterCategory('locations')} className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1 transition">
                                        <Trash2 size={12}/> Limpar
                                    </button>
                                 )}
                             </div>
                             <div className="max-h-32 overflow-y-auto border rounded p-1 space-y-1">
                                {locations.map((l: any) => (
                                    <label key={l.id} className="flex items-center gap-2 px-1 py-1 hover:bg-slate-50 rounded cursor-pointer text-xs text-slate-700">
                                        <input type="checkbox" checked={filters.locations.includes(l.id)} onChange={() => handleCheckboxFilter('locations', l.id)} />
                                        <span>{l.name}</span>
                                    </label>
                                ))}
                             </div>
                         </div>
                    </div>
                )}

                {/* 5. STATUS */}
                {openFilter === 'status' && (
                    <div className="flex flex-col max-h-64">
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase">Filtrar Status</span>
                            {filters.statuses.length > 0 && (
                                <button onClick={() => clearFilterCategory('statuses')} className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1 transition">
                                    <Trash2 size={12}/> Limpar
                                </button>
                            )}
                         </div>
                         <div className="overflow-y-auto space-y-1 pr-1 flex-1">
                            {uniqueStatuses.map(status => (
                                <label key={status} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs font-bold text-slate-700 uppercase">
                                    <input type="checkbox" checked={filters.statuses.includes(status)} onChange={() => handleCheckboxFilter('statuses', status)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                    <span>{status}</span>
                                </label>
                            ))}
                         </div>
                    </div>
                )}
            </div>
        )}

        {/* LISTAGEM PRINCIPAL */}
        <div className="overflow-auto flex-1 relative p-2 md:p-0">
            {/* --- VISÃO MOBILE --- */}
            <div className="md:hidden space-y-3 pb-20"> 
                 {currentData.map((emp: any) => (
                    <div key={emp.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative" onClick={() => setSelectedEmployeeRecord(emp)}>
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                    {getInitials(emp.name)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm leading-tight">{emp.name}</h3>
                                    <p className="text-xs text-slate-500 font-medium">{emp.role}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${emp.status === 'ATIVO' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                {emp.status}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-600 mb-3 bg-slate-50 p-3 rounded-lg">
                            <div className="flex flex-col"><span className="text-slate-400 text-[10px] uppercase">Matrícula</span><span className="font-mono font-medium">{emp.id}</span></div>
                             <div className="flex flex-col"><span className="text-slate-400 text-[10px] uppercase">Salário</span><span className="font-bold text-slate-700">{formatCurrency(emp.salary)}</span></div>
                        </div>
                        <div className="flex justify-end gap-2 mt-2">
                             <button onClick={() => handleOpenEdit(emp)} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Pencil size={16}/></button>
                             <button onClick={() => handleDelete(emp.id, emp.name)} className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 size={16}/></button>
                        </div>
                    </div>
                ))}
                {currentData.length === 0 && <div className="text-center p-8 text-slate-400">Nenhum funcionário encontrado.</div>}
            </div>

            {/* --- VISÃO DESKTOP --- */}
            <div className="hidden md:block">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-4 whitespace-nowrap group cursor-pointer hover:bg-slate-100 transition relative" onClick={() => toggleFilter('employee')}>
                                <div className="flex items-center gap-2">Funcionário <ArrowUpDown size={14} className={`text-slate-400 ${openFilter === 'employee' ? 'text-blue-600' : ''}`} /></div>
                                {(sortConfig.key !== 'name' || sortConfig.direction !== 'asc') && <div className="absolute top-1 right-2 w-2 h-2 rounded-full bg-blue-500"></div>}
                            </th>
                            <th className="px-6 py-4 whitespace-nowrap group cursor-pointer hover:bg-slate-100 transition relative" onClick={() => toggleFilter('details')}>
                                <div className="flex items-center gap-2">Detalhes <Filter size={14} className={`text-slate-400 ${filters.roles.length > 0 ? 'text-blue-600 fill-current' : ''}`} /></div>
                            </th>
                            <th className="px-6 py-4 whitespace-nowrap group cursor-pointer hover:bg-slate-100 transition relative" onClick={() => toggleFilter('location')}>
                                <div className="flex items-center gap-2">Localização <Filter size={14} className={`text-slate-400 ${filters.departments.length > 0 || filters.locations.length > 0 ? 'text-blue-600 fill-current' : ''}`} /></div>
                            </th>
                            <th className="px-6 py-4 whitespace-nowrap group cursor-pointer hover:bg-slate-100 transition relative" onClick={() => toggleFilter('salary')}>
                                <div className="flex items-center gap-2">Salário <ArrowUpDown size={14} className={`text-slate-400 ${openFilter === 'salary' ? 'text-blue-600' : ''}`} /></div>
                            </th>
                            <th className="px-6 py-4 whitespace-nowrap text-center group cursor-pointer hover:bg-slate-100 transition relative" onClick={() => toggleFilter('status')}>
                                <div className="flex items-center justify-center gap-2">Status <Filter size={14} className={`text-slate-400 ${filters.statuses.length > 0 ? 'text-blue-600 fill-current' : ''}`} /></div>
                            </th>
                            <th className="px-6 py-4 text-right whitespace-nowrap">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {currentData.map((emp: any) => (
                            <tr key={emp.id} 
                                onClick={() => setSelectedEmployeeRecord(emp)} // Clique na linha abre o prontuário
                                className="hover:bg-blue-50/50 transition duration-150 group cursor-pointer"
                            >
                                <td className="px-6 py-3"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">{getInitials(emp.name)}</div><div><div className="font-bold text-slate-800">{emp.name}</div><div className="text-xs text-slate-400 font-mono">Mat: {emp.id}</div></div></div></td>
                                <td className="px-6 py-3"><div className="flex flex-col"><span className="font-medium text-slate-700 flex items-center gap-1.5"><Briefcase size={14} className="text-slate-400"/> {emp.role}</span><span className="text-xs text-slate-400 mt-0.5">CPF: {emp.cpf}</span></div></td>
                                <td className="px-6 py-3"><div className="flex flex-col gap-1"><span className="text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200 w-fit flex items-center gap-1"><Building2 size={10} /> {emp.department_id}</span><span className="text-xs text-slate-400 flex items-center gap-1"><MapPin size={10} /> {emp.location_id}</span></div></td>
                                <td className="px-6 py-3 font-mono text-slate-700"><div className="flex items-center gap-2">{formatCurrency(emp.salary)}{emp.status === 'ATIVO' && emp.salary <= BASKET_LIMIT && <span className="bg-orange-100 p-1 rounded-full text-orange-600"><ShoppingBasket size={12} /></span>}</div></td>
                                <td className="px-6 py-3 text-center"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${emp.status === 'ATIVO' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}><span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'ATIVO' ? 'bg-green-500' : 'bg-slate-400'}`}></span>{emp.status}</span></td>
                                <td className="px-6 py-3 text-right"><div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity"><button onClick={() => handleOpenEdit(emp)} className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition"><Pencil size={16} /></button><button onClick={() => handleDelete(emp.id, emp.name)} className="text-slate-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition"><Trash2 size={16} /></button></div></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* PAGINAÇÃO */}
        {totalItems > 0 && (
            <div className="bg-white p-3 md:p-4 border-t border-slate-200 flex items-center justify-between shrink-0 sticky bottom-0 z-20 shadow-inner">
                <span className="text-xs md:text-sm text-slate-500"><span className="hidden sm:inline">Mostrando</span> <b>{startIndex + 1}-{Math.min(endIndex, totalItems)}</b> <span className="hidden sm:inline">de <b>{totalItems}</b></span></span>
                <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 transition"><ChevronLeft size={16}/></button>
                    <span className="text-sm font-medium px-2 text-slate-700">{currentPage}/{totalPages}</span>
                    <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 transition"><ChevronRight size={16}/></button>
                </div>
            </div>
        )}
      </div>

      {/* MODAL DE PRONTUÁRIO */}
      {selectedEmployeeRecord && (
        <EmployeeRecord 
            isOpen={!!selectedEmployeeRecord} 
            employeeId={selectedEmployeeRecord.id} // Passamos apenas o ID
            departments={departments} // Passa lista para o select de edição
            locations={locations}     // Passa lista para o select de edição
            currentUser={user.email}  // Para log de auditoria ao editar
            globalConfig={globalConfig} // Para calculo de VR/VA
            onClose={() => setSelectedEmployeeRecord(null)}
        />
      )}

      {/* --- MENU MOBILE DE FILTROS --- */}
      {isMobileFilterOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex justify-end backdrop-blur-sm">
              <div className="w-full max-w-xs bg-white h-full shadow-2xl animate-in slide-in-from-right duration-200 flex flex-col">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2"><SlidersHorizontal size={18}/> Filtros</h3>
                      <button onClick={() => setIsMobileFilterOpen(false)} className="p-2 bg-white rounded-full text-slate-500 shadow-sm"><X size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-6">
                      
                      <section>
                          <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Ordenação</h4>
                          <div className="space-y-2">
                              {[{l: 'Nome (A-Z)', k: 'name', d: 'asc'}, {l: 'Maior Salário', k: 'salary', d: 'desc'}, {l: 'Menor Salário', k: 'salary', d: 'asc'}, {l: 'Admissão Recente', k: 'admission_date', d: 'desc'}].map(opt => (
                                  <button key={opt.l} onClick={() => handleSort(opt.k, opt.d as any)} 
                                      className={`w-full flex justify-between items-center p-3 rounded-lg border text-sm transition ${sortConfig.key === opt.k && sortConfig.direction === opt.d ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-slate-200 text-slate-600 active:bg-slate-50'}`}>
                                      {opt.l} {sortConfig.key === opt.k && sortConfig.direction === opt.d && <Check size={16}/>}
                                  </button>
                              ))}
                          </div>
                      </section>

                      <section>
                          <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Cargos</h4>
                          <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                              {uniqueRoles.map(role => (
                                  <label key={role} className="flex items-center gap-2 text-sm text-slate-700 py-1">
                                      <input type="checkbox" checked={filters.roles.includes(role)} onChange={() => handleCheckboxFilter('roles', role)} className="rounded text-blue-600 focus:ring-blue-500" />
                                      {role}
                                  </label>
                              ))}
                          </div>
                      </section>

                       <section>
                          <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Status</h4>
                          <div className="flex flex-wrap gap-2">
                              {uniqueStatuses.map(status => (
                                  <button key={status} onClick={() => handleCheckboxFilter('statuses', status)}
                                      className={`px-3 py-1 rounded-full text-xs font-bold border transition ${filters.statuses.includes(status) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                                      {status}
                                  </button>
                              ))}
                          </div>
                      </section>
                  </div>
                  
                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
                      <button onClick={clearAllFilters} className="flex-1 py-3 text-red-600 font-bold text-sm bg-white border border-red-100 rounded-lg">Limpar</button>
                      <button onClick={() => setIsMobileFilterOpen(false)} className="flex-2 py-3 text-white font-bold text-sm bg-slate-900 rounded-lg shadow-lg">Ver Resultados</button>
                  </div>
              </div>
          </div>
      )}

      {/* --- MODAIS DE AÇÃO (Bulk, New, Edit) --- */}
      {/* ... (Conteúdo dos modais mantido igual, apenas renderizado se isBulkModalOpen ou isModalOpen forem true) ... */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-purple-50 px-6 py-4 border-b border-purple-100 flex justify-between items-center">
                    <h3 className="font-bold text-purple-900 flex items-center gap-2"><Users size={20}/> Atualização de Status em Massa</h3>
                    <button onClick={() => setIsBulkModalOpen(false)}><X size={24} className="text-slate-400 hover:text-red-500 transition"/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Ação</label>
                        <select className="w-full border p-2 rounded-lg bg-white" value={bulkType} onChange={(e) => setBulkType(e.target.value as any)}>
                            <option value="FERIAS">Registrar Férias</option>
                            <option value="DEMISSAO">Registrar Demissão</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-1">{bulkType === 'FERIAS' ? 'A planilha deve conter colunas: "Inicio" e "Fim" (dd/mm/aaaa), além da identificação (Matrícula, CPF ou Nome).' : 'A planilha deve conter Nome e CPF (ou Matrícula) dos funcionários a serem demitidos.'}</p>
                    </div>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 hover:bg-white hover:border-purple-400 transition cursor-pointer relative">
                         <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".xlsx" onChange={handleBulkUpdate} disabled={loading} />
                         <Upload size={32} className="mx-auto text-slate-400 mb-2"/>
                         <p className="font-medium text-slate-600">Clique para enviar a planilha (.xlsx)</p>
                         <p className="text-xs text-slate-400 mt-1">O sistema tentará identificar automaticamente por Matrícula, depois CPF, depois Nome.</p>
                    </div>
                </div>
             </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><UserPlus size={20} className="text-blue-600"/> {isEditMode ? 'Editar Funcionário' : 'Novo Cadastro'}</h3>
                <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400 hover:text-red-500 transition"/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Matrícula</label><input required disabled={isEditMode} className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 outline-none transition"  placeholder="Informe a Matricula" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} /></div>
                <div className="col-span-1"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome Completo</label><input required  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase outline-none transition " placeholder="Digite seu nome" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                <div className="col-span-1"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">CPF</label><input required className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="000.000.000-00" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} /></div>
                <div className="col-span-1"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Cargo</label><input required className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase outline-none transition" placeholder="Informe o cargo" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} /></div>
                <div className="col-span-1"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Secretaria</label><select required className="w-full border p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}><option value="">Selecione...</option>{departments.map((d:any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                <div className="col-span-1"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Filial</label><select required className="w-full border p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}><option value="">Selecione...</option>{locations.map((l:any) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                <div className="col-span-1"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Salário Base</label><div className="relative"><DollarSign size={16} className="absolute left-3 top-2.5 text-slate-400"/><input type="number" step="0.01" required className="w-full border p-2 pl-9 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.salary} onChange={e => setFormData({...formData, salary: parseFloat(e.target.value)})} /></div></div>
                <div className="col-span-1"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Status</label><select className="w-full border p-2 rounded-lg bg-white font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>{statuses && statuses.length > 0 ? (statuses.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)) : (<><option value="ATIVO">ATIVO</option><option value="INATIVO">INATIVO</option><option value="MENOR APRENDIZ">MENOR APRENDIZ</option><option value="AFASTADO INSS">AFASTADO INSS</option><option value="AFASTADO DOENCA">AFASTADO DOENCA</option><option value="FERIAS">FERIAS</option><option value="MATERNIDADE">MATERNIDADE</option><option value="DEMITIDO">DEMITIDO</option><option value="AVISO PREVIO TRABALHADO">AVISO PRÉVIO TRABALHADO</option></>)}</select></div>
                {STATUS_TEMPORARIOS.includes(formData.status) && (
                    <div className="col-span-1 sm:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
                        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><CalendarClock size={16} className="text-blue-600"/> Período do Evento</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs text-slate-500 mb-1">Data Início</label><input type="date" required value={formData.statusStartDate} onChange={(e) => setFormData({...formData, statusStartDate: e.target.value})} className="block w-full border p-2 rounded-lg bg-white" /></div>
                            <div><label className="block text-xs text-slate-500 mb-1">Data Fim</label><input type="date" required value={formData.statusEndDate} onChange={(e) => setFormData({...formData, statusEndDate: e.target.value})} className="block w-full border p-2 rounded-lg bg-white" /></div>
                        </div>
                        {impact && (<div className="mt-4 p-3 bg-orange-50 border border-orange-100 rounded-lg text-sm text-orange-900"><p className="font-bold flex items-center gap-2 mb-1"><AlertTriangle size={14} className="text-orange-600" /> Impacto Financeiro</p><ul className="list-disc list-inside space-y-1 text-xs opacity-90"><li>Ausência: <strong>{impact.days} dias úteis</strong>.</li><li>Desconto VA: <strong>{formatCurrency(impact.vaLoss)}</strong></li></ul></div>)}
                    </div>
                )}
                <div className="col-span-1"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Admissão</label><input type="date" className="w-full border p-2 rounded-lg" value={formData.admissionDate} onChange={e => setFormData({...formData, admissionDate: e.target.value})} /></div>
                <div className="col-span-1"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nascimento</label><input type="date" className="w-full border p-2 rounded-lg" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} /></div>
                <div className="col-span-1 sm:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition">Cancelar</button>
                    <button type="submit" disabled={loading} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 shadow-lg shadow-blue-900/10 transition transform hover:-translate-y-0.5">{loading ? 'Salvando...' : (isEditMode ? 'Salvar Alterações' : 'Cadastrar')}</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}