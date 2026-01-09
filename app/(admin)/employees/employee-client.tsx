/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { saveEmployee, deleteEmployee, importEmployeesBatch } from '@/app/actions/employees'
import { 
  Plus, Search, Trash2, Pencil, Upload, Download, FileDown, X, UserPlus, Loader2
} from 'lucide-react'
import * as XLSX from 'xlsx'

export default function EmployeeClient({ initialEmployees, departments, locations, user }: any) {
  const [employees] = useState(initialEmployees)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  
  const [isEditMode, setIsEditMode] = useState(false)
  const [formData, setFormData] = useState({
    id: '', name: '', cpf: '', role: '', salary: 0, 
    department: '', location: '', status: 'ATIVO',
    admissionDate: '', birthDate: ''
  })

  // --- HELPER DE DATA ---
  const excelDateToISO = (val: any) => {
    if (!val || val === '' || val === '-') return null
    try {
        if (typeof val === 'number') {
            const date = new Date(Math.round((val - 25569) * 86400 * 1000))
            return date.toISOString().split('T')[0]
        }
        if (typeof val === 'string') {
            if (val.includes('/')) {
                const parts = val.trim().split('/') // DD/MM/YYYY
                if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
            }
            if (val.includes('-')) return val.trim() // Já está em YYYY-MM-DD
        }
    } catch (e) {
        return null
    }
    return null
  }

  // --- IMPORTAÇÃO CORRIGIDA ---
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
              // CORREÇÃO AQUI: Forçar String no CPF vindo do Excel
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
        alert(`Erro: Nenhuma coluna "Matrícula" encontrada na aba "${targetSheetName}".`)
        setLoading(false)
        return
      }

      setLoadingMessage(`Salvando ${validEmployees.length} funcionários...`)

      const res = await importEmployeesBatch(validEmployees, user.email || 'Admin')
      
      if (res.error) {
        alert('Erro ao salvar no banco:\n' + res.error)
      } else {
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

  // --- RESTO DO CÓDIGO ---
  const filtered = employees.filter((e: any) => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.id.includes(search)
  )

  const handleExport = () => {
    const dataToExport = filtered.map((e: any) => ({
      'Matrícula': e.id,
      'Nome Completo': e.name,
      'CPF': e.cpf,
      'Cargo': e.role,
      'Secretaria': e.department_id,
      'Filial': e.location_id,
      'Salário Base': e.salary,
      'Status': e.status,
      'Data de Admissão': e.admission_date,
      'Data de Nascimento': e.birth_date
    }))
    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Funcionarios")
    XLSX.writeFile(wb, "Base_Funcionarios.xlsx")
  }

  const handleDownloadTemplate = () => {
    const template = [{
      'Matrícula': '12345', 'Nome Completo': 'TESTE DA SILVA', 'CPF': '000.000.000-00', 
      'Cargo': 'ASSISTENTE', 'Secretaria': 'EDUCACAO', 'Filial': 'SEDE', 
      'Salário Base': 1412.00, 'Status': 'ATIVO', 'Data de Admissão': '01/01/2024', 'Data de Nascimento': '01/01/1990'
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
        admissionDate: '', birthDate: ''
    })
    setIsEditMode(false)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (emp: any) => {
    setFormData({
        id: emp.id, name: emp.name, cpf: emp.cpf, role: emp.role, salary: emp.salary,
        department: emp.department_id, location: emp.location_id, status: emp.status,
        admissionDate: emp.admission_date || '', birthDate: emp.birth_date || ''
    })
    setIsEditMode(true)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setLoadingMessage('Salvando...')
    // Ação protegida, mas o formulário também garante string via inputs
    const res = await saveEmployee(formData, user.email || 'Admin', isEditMode)
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

  return (
    <div className="space-y-6">
      {/* LOADING OVERLAY */}
      {loading && (
        <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-9999 text-white">
            <Loader2 size={48} className="animate-spin mb-4" />
            <p className="text-xl font-bold">{loadingMessage || 'Processando...'}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Base de Funcionários</h2>
        
        <div className="flex flex-wrap gap-2">
            <button onClick={handleOpenNew} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-bold">
                <Plus size={18} /> Novo
            </button>
            <button onClick={handleDownloadTemplate} className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition text-sm font-medium">
                <FileDown size={18} /> Modelo
            </button>
            <label className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition text-sm font-medium">
                <Upload size={18} /> Importar
                <input type="file" className="hidden" accept=".xlsx" onChange={handleImport} disabled={loading} />
            </label>
            <button onClick={handleExport} className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition text-sm font-medium">
                <Download size={18} /> Exportar
            </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome ou matrícula..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center text-sm text-slate-500">
            {filtered.length} registros encontrados
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                <th className="px-6 py-4">Matrícula</th>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">CPF</th>
                <th className="px-6 py-4">Secretaria</th>
                <th className="px-6 py-4">Filial</th>
                <th className="px-6 py-4">Cargo</th>
                <th className="px-6 py-4">Salário</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {filtered.map((emp: any) => (
                <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium">{emp.id}</td>
                    <td className="px-6 py-3 font-medium text-slate-800">{emp.name}</td>
                    <td className="px-6 py-3">{emp.cpf}</td>
                    <td className="px-6 py-3"><span className="bg-slate-100 px-2 py-1 rounded text-xs border border-slate-200">{emp.department_id}</span></td>
                    <td className="px-6 py-3 text-slate-500">{emp.location_id}</td>
                    <td className="px-6 py-3">{emp.role}</td>
                    <td className="px-6 py-3 font-mono">{formatCurrency(emp.salary)}</td>
                    <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        emp.status === 'ATIVO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                        {emp.status}
                    </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                        <div className="flex justify-end gap-2">
                            <button onClick={() => handleOpenEdit(emp)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded transition" title="Editar">
                                <Pencil size={16} />
                            </button>
                            <button onClick={() => handleDelete(emp.id, emp.name)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition" title="Excluir">
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <UserPlus size={20} /> {isEditMode ? 'Editar Funcionário' : 'Novo Cadastro'}
                </h3>
                <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400 hover:text-red-500"/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
                <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Matrícula</label>
                    <input required disabled={isEditMode} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" 
                        value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} />
                </div>
                <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label>
                    <input required className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 uppercase" 
                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">CPF</label>
                    <input required className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" placeholder="000.000.000-00"
                        value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} />
                </div>
                <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Cargo</label>
                    <input required className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 uppercase" 
                        value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
                </div>
                
                <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Secretaria</label>
                    <select required className="w-full border p-2 rounded bg-white" 
                        value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                        <option value="">Selecione...</option>
                        {departments.map((d:any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>
                <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Filial</label>
                    <select required className="w-full border p-2 rounded bg-white" 
                        value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}>
                        <option value="">Selecione...</option>
                        {locations.map((l:any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                </div>

                <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Salário Base</label>
                    <input type="number" step="0.01" required className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" 
                        value={formData.salary} onChange={e => setFormData({...formData, salary: parseFloat(e.target.value)})} />
                </div>
                <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                    <select className="w-full border p-2 rounded bg-white" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                        <option value="ATIVO">ATIVO</option>
                        <option value="INATIVO">INATIVO</option>
                        <option value="AFASTADO INSS">AFASTADO INSS</option>
                        <option value="AFASTADO DOENCA">AFASTADO DOENCA</option>
                        <option value="DEMITIDO">DEMITIDO</option>
                        <option value="MATERNIDADE">MATERNIDADE</option>
                    </select>
                </div>

                <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Admissão</label>
                    <input type="date" className="w-full border p-2 rounded" 
                        value={formData.admissionDate} onChange={e => setFormData({...formData, admissionDate: e.target.value})} />
                </div>
                <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Nascimento</label>
                    <input type="date" className="w-full border p-2 rounded" 
                        value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
                </div>

                <div className="col-span-2 flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded">Cancelar</button>
                    <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow-md transition">
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