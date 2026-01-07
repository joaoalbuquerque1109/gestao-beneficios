/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState } from 'react'
import { createEmployee, deleteEmployee } from '@/app/actions/employees'
import { Plus, Search, Trash2, UserPlus, X } from 'lucide-react'

export default function EmployeeClient({ initialEmployees, user }: any) {
  const [employees, setEmployees] = useState(initialEmployees)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Estado do Formulário
  const [formData, setFormData] = useState({
    id: '', name: '', cpf: '', role: '', salary: 0, 
    department: 'EDUCACAO', location: 'SEDE', status: 'ATIVO',
    admissionDate: '', birthDate: ''
  })

  // Filtragem local (rápida)
  const filtered = employees.filter((e: any) => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.id.includes(search)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Chama a Server Action criada no Passo 2
    const res = await createEmployee(formData, user.email || 'Admin')
    
    if (res.error) {
      alert('Erro: ' + res.error)
    } else {
      alert('Funcionário cadastrado com sucesso!')
      setIsModalOpen(false)
      // Recarrega a página para atualizar dados vindo do servidor
      window.location.reload() 
    }
    setLoading(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja remover ${name}?`)) {
        await deleteEmployee(id, name, user.email || 'Admin')
        window.location.reload()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Funcionários</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
        >
          <Plus size={18} /> Novo Funcionário
        </button>
      </div>

      {/* Barra de Pesquisa */}
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
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Matrícula</th>
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Cargo</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((emp: any) => (
              <tr key={emp.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 font-medium">{emp.id}</td>
                <td className="px-6 py-3">{emp.name}</td>
                <td className="px-6 py-3">{emp.role}</td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    emp.status === 'ATIVO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {emp.status}
                  </span>
                </td>
                <td className="px-6 py-3 text-right">
                  <button 
                    onClick={() => handleDelete(emp.id, emp.name)}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Cadastro Simplificado */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <UserPlus size={20} /> Novo Cadastro
                </h3>
                <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400"/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
                <input required placeholder="Matrícula" className="border p-2 rounded" 
                    onChange={e => setFormData({...formData, id: e.target.value})} />
                <input required placeholder="Nome Completo" className="border p-2 rounded" 
                    onChange={e => setFormData({...formData, name: e.target.value})} />
                <input required placeholder="CPF" className="border p-2 rounded" 
                    onChange={e => setFormData({...formData, cpf: e.target.value})} />
                <input required placeholder="Cargo" className="border p-2 rounded" 
                    onChange={e => setFormData({...formData, role: e.target.value})} />
                <input type="number" step="0.01" required placeholder="Salário" className="border p-2 rounded" 
                    onChange={e => setFormData({...formData, salary: parseFloat(e.target.value)})} />
                <select className="border p-2 rounded" onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="ATIVO">ATIVO</option>
                    <option value="INATIVO">INATIVO</option>
                </select>
                {/* Campos de Data */}
                <div className="col-span-1">
                    <label className="text-xs text-slate-500">Admissão</label>
                    <input type="date" required className="border p-2 rounded w-full" 
                        onChange={e => setFormData({...formData, admissionDate: e.target.value})} />
                </div>
                <div className="col-span-1">
                    <label className="text-xs text-slate-500">Nascimento</label>
                    <input type="date" required className="border p-2 rounded w-full" 
                        onChange={e => setFormData({...formData, birthDate: e.target.value})} />
                </div>

                <div className="col-span-2 flex justify-end gap-3 mt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600">Cancelar</button>
                    <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        {loading ? 'Salvando...' : 'Salvar Funcionário'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}