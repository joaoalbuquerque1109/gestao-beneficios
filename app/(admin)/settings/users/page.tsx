import { getUsersList } from '@/lib/db'
import UsersTable from '@/components/UsersTable'
import CreateUserForm from './create-user-form' // Caminho relativo direto

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const { data: users, total, error } = await getUsersList({
    limit: 100,
    offset: 0,
  })

  return (
    <div className="space-y-6 md:space-y-8 pb-20 md:pb-10">
      {/* HEADER */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">Gerenciar Usuários</h1>
        <p className="text-sm text-slate-500">Controle de acesso e criação de contas.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* FORMULÁRIO DE CRIAÇÃO (Sticky no Desktop) */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-4">
             <CreateUserForm />
          </div>
        </div>

        {/* TABELA DE USUÁRIOS */}
        <div className="lg:col-span-2">
          {error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
              <span className="font-bold block mb-1">Erro ao carregar dados:</span>
              {error}
            </div>
          ) : (
            <UsersTable users={users} total={total} />
          )}
        </div>
      </div>
    </div>
  )
}