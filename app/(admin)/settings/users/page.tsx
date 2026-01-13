'use client'

import { createNewUser } from '@/app/actions/create-user'
import { useActionState } from 'react' // MUDANÇA 1: Importar do 'react'
import { useFormStatus } from 'react-dom'
import { Save, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react'

// O componente SubmitButton continua igual, usando useFormStatus que é ótimo para capturar o loading
function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
    >
      {pending ? (
        'Salvando...'
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

export default function CreateUserPage() {
  // MUDANÇA 2: Usar useActionState em vez de useFormState
  const [state, formAction] = useActionState(createNewUser, initialState)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <UserPlus className="text-blue-600" />
          Gerenciar Usuários
        </h1>
        <p className="text-slate-500">Crie novos acessos e defina permissões do sistema.</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <form action={formAction} className="space-y-6">
          
          {/* Feedback Visual */}
          {state.message && (
            <div className={`p-4 rounded flex items-center gap-2 ${
              state.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {state.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
              {state.message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nome Completo */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Nome Completo</label>
              <input
                name="fullName"
                type="text"
                required
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: João da Silva"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email Corporativo</label>
              <input
                name="email"
                type="email"
                required
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="joao@empresa.com"
              />
            </div>

            {/* Senha Inicial */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Senha Inicial</label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="******"
              />
            </div>

            {/* Perfil de Acesso */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Perfil de Acesso</label>
              <select
                name="role"
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="USER">Usuário Padrão</option>
                <option value="RH">Analista RH</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  )
}