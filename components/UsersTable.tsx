/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { Mail, Calendar, User as UserIcon, Trash2, Loader2 } from 'lucide-react'
import { deleteUser } from '@/app/actions/users'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UsersTable({ users, total }: { users: any[], total: number }) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
      if(!confirm('Tem certeza que deseja excluir este usuário?')) return

      setDeletingId(id)
      const res = await deleteUser(id)
      setDeletingId(null)

      if (res.error) {
          alert('Erro ao excluir: ' + res.error)
      } else {
          router.refresh()
      }
  }
  
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'RH': return 'bg-blue-100 text-blue-700 border-blue-200'
      default: return 'bg-slate-100 text-slate-600 border-slate-200'
    }
  }

  // Se users for nulo ou undefined, garante um array vazio para não quebrar o map
  const safeUsers = users || []

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
            <h3 className="font-bold text-slate-700">Usuários Cadastrados</h3>
            <span className="text-xs bg-slate-200 px-2 py-1 rounded-full text-slate-600 font-bold">
                {total}
            </span>
        </div>

        <div className="bg-slate-50 md:bg-white md:rounded-xl md:shadow-sm md:border md:border-slate-200 overflow-hidden">
            
            {/* MOBILE: CARDS */}
            <div className="md:hidden space-y-3 p-1">
                {safeUsers.map((u, index) => (
                    /* AQUI: Key adicionada na div principal do card */
                    <div key={u.id || index} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3 relative">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                    <UserIcon size={20}/>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">{u.full_name || 'Sem nome'}</p>
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border mt-1 ${getRoleBadge(u.role)}`}>
                                        {u.role}
                                    </span>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleDelete(u.id)}
                                disabled={deletingId === u.id}
                                className="text-slate-400 hover:text-red-600 p-2"
                            >
                                {deletingId === u.id ? <Loader2 size={18} className="animate-spin text-red-600"/> : <Trash2 size={18}/>}
                            </button>
                        </div>
                        
                        <div className="text-xs text-slate-500 space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-2">
                                <Mail size={14} className="text-slate-400"/>
                                <span className="truncate">{u.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-slate-400"/>
                                <span>Criado em: {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '-'}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* DESKTOP: TABELA */}
            <div className="hidden md:block">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Usuário</th>
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4">Perfil</th>
                            <th className="px-6 py-4">Criado em</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {safeUsers.map((u, index) => (
                            /* AQUI: Key adicionada na TR */
                            <tr key={u.id || index} className="hover:bg-slate-50 transition">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                                            {u.full_name?.[0] || u.email?.[0] || 'U'}
                                        </div>
                                        <span className="font-medium text-slate-800">{u.full_name || 'Sem nome'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-500">{u.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${getRoleBadge(u.role)}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-400">
                                    {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '-'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => handleDelete(u.id)}
                                        disabled={deletingId === u.id}
                                        className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                                        title="Excluir Usuário"
                                    >
                                        {deletingId === u.id ? <Loader2 size={18} className="animate-spin"/> : <Trash2 size={18}/>}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  )
}