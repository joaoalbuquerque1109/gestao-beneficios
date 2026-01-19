'use client'

import { createNewUser } from '@/app/actions/users' 
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Save, UserPlus, AlertCircle, CheckCircle2, User, Mail, Lock, Shield } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-all shadow-md active:scale-95 font-bold text-sm"
    >
      {pending ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          Salvando...
        </>
      ) : (
        <>
          <Save size={18} />
          Criar Usuário
        </>
      )}
    </button>
  )
}

const initialState = {
  message: '',
  type: ''
}

export default function CreateUserForm() {
  const [state, formAction] = useActionState(createNewUser, initialState)

  return (
    <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
        <UserPlus className="text-blue-600" size={20} />
        Novo Usuário
      </h2>

      <form action={formAction} className="space-y-4">
        {/* Feedback Visual */}
        {state.message && (
          <div className={`p-3 rounded-lg flex items-start gap-3 text-sm ${
              state.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {state.type === 'success' ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
            <span>{state.message}</span>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input name="fullName" type="text" required className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="João da Silva" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Email Corporativo</label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input name="email" type="email" required className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="joao@empresa.com" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Senha Inicial</label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input name="password" type="password" required minLength={6} className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="••••••••" />
          </div>
          <p className="text-[10px] text-slate-400 text-right">Mínimo 6 caracteres</p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Perfil de Acesso</label>
          <div className="relative">
            <Shield className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <select name="role" className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white" defaultValue="USER">
                <option value="USER">Usuário Padrão</option>
                <option value="RH">Analista RH</option>
                <option value="ADMIN">Administrador</option>
            </select>
          </div>
        </div>

        <div className="pt-2">
            <SubmitButton />
        </div>
      </form>
    </div>
  )
}