import { createNewUser } from '@/app/actions/create-user'
import { getUsersList } from '@/lib/db'
import UsersTable from '@/components/UsersTable'
import CreateUserForm from '@/app/(admin)/settings/users/create-user-form'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const { data: users, total, error } = await getUsersList({
    limit: 100,
    offset: 0,
  })

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Gerenciar Usuários</h1>
        <p className="text-slate-500 mt-1">Crie novos acessos e visualize os usuários do sistema.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FORMULÁRIO DE CRIAÇÃO - Coluna esquerda */}
        <div className="lg:col-span-1">
          <CreateUserForm />
        </div>

        {/* TABELA DE USUÁRIOS - Coluna direita */}
        <div className="lg:col-span-2">
          {error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
              Erro ao carregar usuários: {error}
            </div>
          ) : (
            <UsersTable users={users} total={total} />
          )}
        </div>
      </div>
    </div>
  )
}