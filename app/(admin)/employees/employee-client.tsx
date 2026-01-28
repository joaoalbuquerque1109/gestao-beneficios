/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { saveEmployee, deleteEmployee, importEmployeesBatch, updateStatusBatch } from '@/app/actions/employees'
import { 
  Plus, Search, Trash2, Pencil, Upload, Download, FileDown, X, UserPlus, Loader2,
  ChevronLeft, ChevronRight, CalendarClock, AlertTriangle, ShoppingBasket, CheckCircle, XCircle,
  Building2, MapPin, Briefcase, DollarSign, Users
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { differenceInBusinessDays, parseISO, isValid } from 'date-fns'

export default function EmployeeClient({ initialEmployees, departments, locations, user, globalConfig }: any) {
  const [employees, setEmployees] = useState(initialEmployees)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Estados para Atualização em Massa
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [bulkType, setBulkType] = useState<'DEMISSAO' | 'FERIAS'>('FERIAS')
  
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  
  const [showBasketOnly, setShowBasketOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [isEditMode, setIsEditMode] = useState(false)
  
  const [formData, setFormData] = useState({
    id: '', name: '', cpf: '', role: '', salary: 0, 
    department: '', location: '', status: 'ATIVO',
    admissionDate: '', birthDate: '',
    statusStartDate: '', statusEndDate: ''
  })

  const BASKET_LIMIT = Number(globalConfig?.basket_limit) || 1780.00
  
  const eligibleForBasketCount = employees.filter((e: any) => 
    e.status === 'ATIVO' && Number(e.salary) <= BASKET_LIMIT
  ).length

  const STATUS_TEMPORARIOS = ["AFASTADO INSS", "AFASTADO DOENCA", "FERIAS", "MATERNIDADE"]

  useEffect(() => { setCurrentPage(1) }, [search, showBasketOnly])

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

  // Lógica para encontrar funcionário (usada na atualização em massa)
  const findEmployee = (row: any) => {
      // 1. Tenta por Matrícula
      if (row['Matrícula'] || row['Matricula']) {
          const id = String(row['Matrícula'] || row['Matricula']).trim()
          const found = employees.find((e: any) => e.id === id)
          if (found) return found
      }
      // 2. Tenta por CPF
      if (row['CPF']) {
          const cpf = String(row['CPF']).replace(/\D/g, '')
          const found = employees.find((e: any) => e.cpf === cpf)
          if (found) return found
      }
      // 3. Tenta por Nome (Match exato em maiúsculo)
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
                // Monta o objeto de atualização
                const updateObj: any = {
                    id: emp.id,
                    name: emp.name,
                    status: bulkType === 'DEMISSAO' ? 'DEMITIDO' : 'FERIAS'
                }

                if (bulkType === 'FERIAS') {
                    // Tenta ler datas de início e fim
                    const start = excelDateToISO(row['Inicio'] || row['Início'] || row['Data Inicio'] || row['Start'])
                    const end = excelDateToISO(row['Fim'] || row['Data Fim'] || row['End'])
                    
                    if (start && end) {
                        updateObj.status_start_date = start
                        updateObj.status_end_date = end
                    } else {
                        // Se não tiver datas, ignoramos ou definimos só o status? 
                        // Melhor não alterar se faltar data para Férias.
                        return 
                    }
                } else if (bulkType === 'DEMISSAO') {
                    // Demissão limpa as datas de eventos futuros/passados ou mantemos?
                    // Geralmente demissão é definitiva, então limpamos datas de evento
                    updateObj.status_start_date = null
                    updateObj.status_end_date = null
                }

                updates.push(updateObj)
            } else {
                notFoundCount++
            }
        })

        if (updates.length === 0) {
            alert('Nenhum funcionário encontrado ou dados inválidos (datas) na planilha.')
            setLoading(false)
            return
        }

        const confirmMsg = `Serão atualizados ${updates.length} funcionários para status "${bulkType === 'DEMISSAO' ? 'DEMITIDO' : 'FÉRIAS'}".\n` +
                           (notFoundCount > 0 ? `\n⚠️ ${notFoundCount} linhas não foram encontradas (Nome/CPF não bateram).\n` : '') +
                           `\nDeseja continuar?`

        if (confirm(confirmMsg)) {
            setLoadingMessage(`Atualizando ${updates.length} registros...`)
            const res = await updateStatusBatch(updates, user.email || 'Admin')
            if (res.errors && res.errors.length > 0) {
                alert(`Concluído com ${res.count} sucessos e ${res.errors.length} erros.\nVerifique o console para detalhes.`)
                console.error(res.errors)
            } else {
                alert('Atualização em massa concluída com sucesso!')
            }
            window.location.reload()
        }

    } catch (err: any) {
        console.error(err)
        alert('Erro ao processar: ' + err.message)
    } finally {
        setLoading(false)
        setIsBulkModalOpen(false)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // ... (Código de Importação existente mantido igual) ...
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
        if (modeloSheet) {
            targetSheetName = modeloSheet
            worksheet = workbook.Sheets[targetSheetName]
            jsonData = XLSX.utils.sheet_to_json(worksheet)
        }
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
      const validEmployees = parsedEmployees.filter((e: any) => e.id && e.id !== 'undefined' && e.name)
      if (validEmployees.length === 0) {
        alert(`Erro: Nenhuma coluna "Matrícula" encontrada.`)
        setLoading(false)
        return
      }
      setLoadingMessage(`Salvando ${validEmployees.length} funcionários...`)
      const res = await importEmployeesBatch(validEmployees, user.email || 'Admin')
      if (res.error) alert('Erro ao salvar no banco:\n' + res.error)
      else {
        alert(`Sucesso! ${res.count} funcionários importados.`)
        window.location.reload()
      }
    } catch (err: any) {
      console.error(err)
      alert('Erro crítico: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const filtered = employees.filter((e: any) => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.id.includes(search)
    const matchesBasket = showBasketOnly ? (Number(e.salary) <= BASKET_LIMIT && e.status === 'ATIVO') : true
    return matchesSearch && matchesBasket
  })

  const totalItems = filtered.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = filtered.slice(startIndex, endIndex)

  const handleExport = () => {
    const dataToExport = filtered.map((e: any) => ({
      'Matrícula': e.id, 'Nome Completo': e.name, 'CPF': e.cpf, 'Cargo': e.role,
      'Secretaria': e.department_id, 'Filial': e.location_id, 'Salário Base': e.salary,
      'Status': e.status, 'Data de Admissão': e.admission_date, 'Data de Nascimento': e.birth_date
    }))
    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Funcionarios")
    XLSX.writeFile(wb, "Base_Funcionarios.xlsx")
  }

  const handleDownloadTemplate = () => {
    const template = [{
      'Matrícula': '12345', 'Nome Completo': 'TESTE', 'CPF': '000.000.000-00', 
      'Cargo': 'ASSISTENTE', 'Secretaria': 'EDUCACAO', 'Filial': 'SEDE', 
      'Salário Base': 1412.00, 'Status': 'ATIVO', 'Data de Admissão': '2024-01-01', 'Data de Nascimento': '1990-01-01'
    }]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Modelo")
    XLSX.writeFile(wb, "Modelo_Importacao.xlsx")
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
    const dataToSave = { ...formData }
    const res = await saveEmployee(dataToSave, user.email || 'Admin', isEditMode)
    if (res.error) alert('Erro: ' + res.error)
    else {
      alert(isEditMode ? 'Atualizado!' : 'Cadastrado!')
      setIsModalOpen(false)
      window.location.reload()
    }
    setLoading(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`ATENÇÃO: Deseja excluir ${name}?\nIsso apagará histórico financeiro e faltas.`)) {
        setLoading(true)
        setLoadingMessage('Excluindo...')
        const res = await deleteEmployee(id, name, user.email || 'Admin')
        if (res.error) alert('Falha ao excluir:\n' + res.error)
        else {
            alert('Removido com sucesso.')
            window.location.reload()
        }
        setLoading(false)
    }
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).slice(0, 2).join('').toUpperCase()
  }

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
                <Upload size={18} /> Importar (Geral)
                <input type="file" className="hidden" accept=".xlsx" onChange={handleImport} disabled={loading} />
            </label>
             <button onClick={handleExport} className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition text-sm font-medium">
                <Download size={18} /> Exportar
            </button>
        </div>
      </div>

      {/* --- FILTROS --- */}
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

        <button 
            onClick={() => setShowBasketOnly(!showBasketOnly)}
            className={`w-full md:w-auto flex items-center justify-center md:justify-start gap-3 px-4 py-2 rounded-lg border transition ${
                showBasketOnly 
                ? 'bg-orange-50 border-orange-300 text-orange-800' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
        >
            <div className={`p-1.5 rounded-full ${showBasketOnly ? 'bg-orange-200 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                <ShoppingBasket size={18} />
            </div>
            <div className="text-left leading-tight">
                <span className="text-xs font-bold uppercase block">Recebem Cesta</span>
                <span className="text-sm font-medium">
                    {eligibleForBasketCount} Funcionários
                </span>
            </div>
            {showBasketOnly && <X size={16} className="ml-2 text-orange-400" />}
        </button>
      </div>

      {/* --- ÁREA DE CONTEÚDO (TABELA/CARDS) --- */}
      <div className="bg-slate-50 md:bg-white md:rounded-xl md:shadow-sm md:border md:border-slate-200 flex flex-col flex-1 min-h-0 overflow-hidden">
        
        <div className="hidden md:flex p-4 border-b border-slate-100 justify-between items-center bg-white shrink-0">
            <span className="font-semibold text-slate-700">Listagem</span>
            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 font-bold">
                {totalItems} Registros
            </span>
        </div>

        <div className="overflow-auto flex-1 relative p-2 md:p-0">
            {/* --- VISÃO MOBILE --- */}
            <div className="md:hidden space-y-3 pb-20"> 
                {currentData.length === 0 ? (
                     <div className="text-center p-8 text-slate-400 bg-white rounded-lg border border-dashed border-slate-300">
                        Nenhum funcionário encontrado.
                    </div>
                ) : currentData.map((emp: any) => (
                    <div key={emp.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
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
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                emp.status === 'ATIVO' ? 'bg-green-100 text-green-700' : 
                                emp.status === 'INATIVO' ? 'bg-slate-100 text-slate-500' :
                                emp.status === 'AVISO PREVIO TRABALHADO' ? 'bg-slate-100 text-purple-400' : 'bg-orange-100 text-orange-700'
                            }`}>
                                {emp.status}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-600 mb-3 bg-slate-50 p-3 rounded-lg">
                            <div className="flex flex-col">
                                <span className="text-slate-400 text-[10px] uppercase">Matrícula</span>
                                <span className="font-mono font-medium">{emp.id}</span>
                            </div>
                             <div className="flex flex-col">
                                <span className="text-slate-400 text-[10px] uppercase">Salário</span>
                                <span className="font-bold text-slate-700">{formatCurrency(emp.salary)}</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-1">
                            <div className="flex gap-2">
                                {emp.status === 'ATIVO' && emp.salary <= BASKET_LIMIT && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                                        <ShoppingBasket size={12}/> Cesta
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleOpenEdit(emp)} className="p-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold flex items-center gap-1">
                                    <Pencil size={14}/> Editar
                                </button>
                                <button onClick={() => handleDelete(emp.id, emp.name)} className="p-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold">
                                    <Trash2 size={14}/>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- VISÃO DESKTOP --- */}
            <div className="hidden md:block">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-4 whitespace-nowrap">Funcionário</th>
                            <th className="px-6 py-4 whitespace-nowrap">Detalhes</th>
                            <th className="px-6 py-4 whitespace-nowrap">Localização</th>
                            <th className="px-6 py-4 whitespace-nowrap">Salário</th>
                            <th className="px-6 py-4 whitespace-nowrap text-center">Status</th>
                            <th className="px-6 py-4 text-right whitespace-nowrap">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {currentData.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-400">Nenhum funcionário encontrado.</td>
                            </tr>
                        ) : currentData.map((emp: any) => (
                            <tr key={emp.id} className="hover:bg-blue-50/30 transition duration-150 group">
                                <td className="px-6 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold border border-slate-200">
                                            {getInitials(emp.name)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800">{emp.name}</div>
                                            <div className="text-xs text-slate-400 font-mono">Mat: {emp.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-slate-700 flex items-center gap-1.5">
                                            <Briefcase size={14} className="text-slate-400"/> {emp.role}
                                        </span>
                                        <span className="text-xs text-slate-400 mt-0.5">CPF: {emp.cpf}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200 w-fit flex items-center gap-1">
                                            <Building2 size={10} /> {emp.department_id}
                                        </span>
                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                            <MapPin size={10} /> {emp.location_id}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-3 font-mono text-slate-700">
                                    <div className="flex items-center gap-2">
                                        {formatCurrency(emp.salary)}
                                        {emp.status === 'ATIVO' && emp.salary <= BASKET_LIMIT && (
                                            <span title="Recebe Cesta" className="bg-orange-100 p-1 rounded-full text-orange-600">
                                                <ShoppingBasket size={12} />
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-3 text-center">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                                        emp.status === 'ATIVO' ? 'bg-green-50 text-green-700 border-green-200' : 
                                        emp.status === 'INATIVO' ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                            emp.status === 'ATIVO' ? 'bg-green-500' : 
                                            emp.status === 'INATIVO' ? 'bg-slate-400' : 'bg-orange-500'
                                        }`}></span>
                                        {emp.status}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleOpenEdit(emp)} className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition" title="Editar">
                                            <Pencil size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(emp.id, emp.name)} className="text-slate-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition" title="Excluir">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Rodapé Paginação */}
        {totalItems > 0 && (
            <div className="bg-white p-3 md:p-4 border-t border-slate-200 flex items-center justify-between shrink-0 sticky bottom-0 z-20 shadow-inner">
                <span className="text-xs md:text-sm text-slate-500">
                     <span className="hidden sm:inline">Mostrando</span> <b>{startIndex + 1}-{Math.min(endIndex, totalItems)}</b> <span className="hidden sm:inline">de <b>{totalItems}</b></span>
                </span>
                <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 transition">
                        <ChevronLeft size={16}/>
                    </button>
                    <span className="text-sm font-medium px-2 text-slate-700">{currentPage}/{totalPages}</span>
                    <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 transition">
                        <ChevronRight size={16}/>
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* --- MODAL DE ATUALIZAÇÃO EM MASSA (NOVO) --- */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-purple-50 px-6 py-4 border-b border-purple-100 flex justify-between items-center">
                    <h3 className="font-bold text-purple-900 flex items-center gap-2">
                        <Users size={20}/> Atualização de Status em Massa
                    </h3>
                    <button onClick={() => setIsBulkModalOpen(false)}><X size={24} className="text-slate-400 hover:text-red-500 transition"/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Ação</label>
                        <select 
                            className="w-full border p-2 rounded-lg bg-white"
                            value={bulkType} 
                            onChange={(e) => setBulkType(e.target.value as any)}
                        >
                            <option value="FERIAS">Registrar Férias</option>
                            <option value="DEMISSAO">Registrar Demissão</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                            {bulkType === 'FERIAS' 
                                ? 'A planilha deve conter colunas: "Inicio" e "Fim" (dd/mm/aaaa), além da identificação (Matrícula, CPF ou Nome).' 
                                : 'A planilha deve conter Nome e CPF (ou Matrícula) dos funcionários a serem demitidos.'
                            }
                        </p>
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

      {/* --- MODAL NOVO/EDITAR --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <UserPlus size={20} className="text-blue-600"/> {isEditMode ? 'Editar Funcionário' : 'Novo Cadastro'}
                </h3>
                <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400 hover:text-red-500 transition"/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Matrícula</label>
                    <input required disabled={isEditMode} className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 outline-none transition" 
                        value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} />
                </div>
                <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome Completo</label>
                    <input required className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase outline-none transition" 
                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">CPF</label>
                    <input required className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="000.000.000-00"
                        value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} />
                </div>
                <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Cargo</label>
                    <input required className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase outline-none transition" 
                        value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
                </div>
                
                <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Secretaria</label>
                    <select required className="w-full border p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                        value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                        <option value="">Selecione...</option>
                        {departments.map((d:any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>
                <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Filial</label>
                    <select required className="w-full border p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" 
                        value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}>
                        <option value="">Selecione...</option>
                        {locations.map((l:any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                </div>

                <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Salário Base</label>
                    <div className="relative">
                        <DollarSign size={16} className="absolute left-3 top-2.5 text-slate-400"/>
                        <input type="number" step="0.01" required className="w-full border p-2 pl-9 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                            value={formData.salary} onChange={e => setFormData({...formData, salary: parseFloat(e.target.value)})} />
                    </div>
                </div>
                
                <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Status</label>
                    <select className="w-full border p-2 rounded-lg bg-white font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                        <option value="ATIVO">ATIVO</option>
                        <option value="INATIVO">INATIVO</option>
                        <option value="MENOR APRENDIZ">MENOR APRENDIZ</option>
                        <option value="AFASTADO INSS">AFASTADO INSS</option>
                        <option value="AFASTADO DOENCA">AFASTADO DOENCA</option>
                        <option value="FERIAS">FERIAS</option>
                        <option value="MATERNIDADE">MATERNIDADE</option>
                        <option value="DEMITIDO">DEMITIDO</option>
                        <option value="AVISO PREVIO TRABALHADO">AVISO PRÉVIO TRABALHADO</option>
                    </select>
                </div>

                {STATUS_TEMPORARIOS.includes(formData.status) && (
                    <div className="col-span-1 sm:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
                        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                           <CalendarClock size={16} className="text-blue-600"/> Período do Evento
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Data Início</label>
                                <input type="date" required value={formData.statusStartDate} onChange={(e) => setFormData({...formData, statusStartDate: e.target.value})} className="block w-full border p-2 rounded-lg bg-white" />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Data Fim</label>
                                <input type="date" required value={formData.statusEndDate} onChange={(e) => setFormData({...formData, statusEndDate: e.target.value})} className="block w-full border p-2 rounded-lg bg-white" />
                            </div>
                        </div>
                        {impact && (
                            <div className="mt-4 p-3 bg-orange-50 border border-orange-100 rounded-lg text-sm text-orange-900">
                                <p className="font-bold flex items-center gap-2 mb-1">
                                    <AlertTriangle size={14} className="text-orange-600" /> Impacto Financeiro
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-xs opacity-90">
                                    <li>Ausência: <strong>{impact.days} dias úteis</strong>.</li>
                                    <li>Desconto VA: <strong>{formatCurrency(impact.vaLoss)}</strong></li>
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Admissão</label>
                    <input type="date" className="w-full border p-2 rounded-lg" value={formData.admissionDate} onChange={e => setFormData({...formData, admissionDate: e.target.value})} />
                </div>
                <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nascimento</label>
                    <input type="date" className="w-full border p-2 rounded-lg" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
                </div>

                <div className="col-span-1 sm:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition">Cancelar</button>
                    <button type="submit" disabled={loading} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 shadow-lg shadow-blue-900/10 transition transform hover:-translate-y-0.5">
                        {loading ? 'Salvando...' : (isEditMode ? 'Salvar Alterações' : 'Cadastrar')}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}