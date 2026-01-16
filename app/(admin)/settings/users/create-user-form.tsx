'use client'

import { createNewUser } from '@/app/actions/create-user'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Save, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
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
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 sticky top-8">
      <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-6">
        <UserPlus className="text-blue-600" size={20} />
        Novo Usuário
      </h2>

      <form action={formAction} className="space-y-5">
        {/* Feedback Visual */}
        {state.message && (
          <div
            className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
              state.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {state.type === 'success' ? (
              <CheckCircle2 size={18} className="flex-shrink-0" />
            ) : (
              <AlertCircle size={18} className="flex-shrink-0" />
            )}
            <span>{state.message}</span>
          </div>
        )}

        {/* Nome Completo */}
        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-medium text-slate-700">
            Nome Completo
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm"
            placeholder="João da Silva"
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email Corporativo
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm"
            placeholder="joao@empresa.com"
          />
        </div>

        {/* Senha Inicial */}
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            Senha Inicial
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm"
            placeholder="••••••••"
          />
          <p className="text-xs text-slate-500">Mínimo 6 caracteres</p>
        </div>

        {/* Perfil de Acesso */}
        <div className="space-y-2">
          <label htmlFor="role" className="text-sm font-medium text-slate-700">
            Perfil de Acesso
          </label>
          <select
            id="role"
            name="role"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm bg-white"
            defaultValue="USER"
          >
            <option value="USER">Usuário Padrão</option>
            <option value="RH">Analista RH</option>
            <option value="FINANCE">Analista Financeiro</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>

        <SubmitButton />
      </form>
    </div>
  )
}
