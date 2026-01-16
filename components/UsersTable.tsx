'use client'

import { Mail, Shield, Calendar, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState } from 'react'

interface User {
  id: string
  email: string
  role: string
  created_at: string
}

interface UsersTableProps {
  users: User[]
  total: number
}

export default function UsersTable({ users, total }: UsersTableProps) {
  const [openAbsenceForm, setOpenAbsenceForm] = useState<string | null>(null)
  const [absenceData, setAbsenceData] = useState({ date: '', reason: '' })

  const handleAddAbsence = (userId: string) => {
    setOpenAbsenceForm(userId)
    setAbsenceData({ date: '', reason: '' })
  }

  const handleSubmitAbsence = (userId: string) => {
    // TODO: Implementar chamada de server action para adicionar falta
    console.log('Adicionando falta para usuário:', userId, absenceData)
    setOpenAbsenceForm(null)
    setAbsenceData({ date: '', reason: '' })
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN':
        return 'bg-yellow-100 text-yellow-800'
      case 'RH':
        return 'bg-blue-100 text-blue-800'
      case 'FINANCE':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h2 className="text-lg font-semibold text-slate-800">Usuários do Sistema</h2>
        <p className="text-sm text-slate-500 mt-1">Total de {total} usuário(s)</p>
      </div>

      {users.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-slate-500">Nenhum usuário cadastrado ainda.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  E-mail
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Perfil
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Data de Criação
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-slate-400" />
                      <span className="text-sm font-medium text-slate-900">
                        {user.email}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(
                        user.role
                      )}`}
                    >
                      <Shield size={14} />
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar size={16} className="text-slate-400" />
                      {format(new Date(user.created_at), 'dd/MM/yyyy', {
                        locale: ptBR,
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
