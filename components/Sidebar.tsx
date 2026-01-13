'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { 
  LayoutDashboard, Users, FileSpreadsheet, Calculator, 
  History, LogOut, Settings as SettingsIcon, CheckCircle, Scale, Activity, Loader2, UserCog
} from 'lucide-react' // Adicionei UserCog se quiser um ícone diferente, ou use SettingsIcon
import { useState, useEffect, ComponentType, SVGProps } from 'react'

// Definição do tipo para facilitar o TypeScript
type NavItem = {
  label: string
  path: string
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>
  allowed: string[] // Lista de roles que podem ver este item
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  
  const [role, setRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const getUserProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user?.email) {
          // Busca perfil usando ilike para ignorar Case Sensitive
          const { data: profile } = await supabase
            .from('user_profiles') 
            .select('role')
            .ilike('email', session.user.email)
            .single()

          if (profile) {
            setRole(profile.role)
          } else {
            console.warn('Perfil não encontrado.')
          }
        }
      } catch (error) {
        console.error('Erro ao buscar perfil:', error)
      } finally {
        setIsLoading(false)
      }
    }

    getUserProfile()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.replace('/login')
  }

  // LISTA MESTRE DE NAVEGAÇÃO
  // Aqui definimos quem pode ver o que: 'USER', 'RH', 'ADMIN'
  const allNavItems: NavItem[] = [
    { 
      label: 'Resumo', 
      path: '/', 
      icon: LayoutDashboard, 
      allowed: ['USER', 'RH', 'ADMIN'] 
    },
    { 
      label: 'Funcionários', 
      path: '/employees', 
      icon: Users, 
      allowed: ['USER', 'RH', 'ADMIN'] 
    },
    { 
      label: 'Movimentações', 
      path: '/movements', 
      icon: Activity, 
      allowed: ['RH', 'ADMIN'] // USER não vê
    },
    { 
      label: 'Faltas', 
      path: '/absences', 
      icon: FileSpreadsheet, 
      allowed: ['USER', 'RH', 'ADMIN'] 
    },
    { 
      label: 'Apuração', 
      path: '/calculation', 
      icon: Calculator, 
      allowed: ['RH', 'ADMIN'] // Crítico: USER não vê
    },
    { 
      label: 'Aprovação', 
      path: '/approval', 
      icon: CheckCircle, 
      allowed: ['RH', 'ADMIN'] // Crítico: USER não vê
    },
    { 
      label: 'Auditoria', 
      path: '/audit', 
      icon: History, 
      allowed: ['ADMIN'] // Apenas Admin
    },
    { 
      label: 'Ajustes', 
      path: '/adjustments', 
      icon: Scale, 
      allowed: ['ADMIN'] 
    },
    { 
      label: 'Configurações', 
      path: '/settings', 
      icon: SettingsIcon, 
      allowed: ['ADMIN'] 
    },
    { 
      label: 'Gestão de Usuários', 
      path: '/settings/users', 
      icon: UserCog, // Reutilizando ícone Users ou use outro de sua preferência
      allowed: ['ADMIN'] 
    },
  ]

  // Filtra os itens baseado na role atual
  // Se estiver carregando ou sem role, retorna array vazio para segurança
  const filteredNavItems = isLoading || !role 
    ? [] 
    : allNavItems.filter(item => item.allowed.includes(role))

  return (
    <aside className="w-64 bg-slate-800 text-white hidden md:flex flex-col h-screen fixed left-0 top-0 overflow-y-auto z-50 shadow-xl">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="text-blue-400">Vale</span>Gestão
        </h1>
        <p className="text-xs text-slate-400 mt-1">Sistema Integrado RH</p>
      </div>

      <nav className="flex-1 py-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-32 space-y-2 text-slate-500">
            <Loader2 className="animate-spin" size={24} />
            <span className="text-xs">Carregando acesso...</span>
          </div>
        ) : (
          <ul className="space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all duration-200 ${
                      isActive 
                        ? 'bg-slate-700 text-white' // Ativo: Apenas um fundo cinza mais claro e texto branco
                        : 'text-slate-400 hover:bg-slate-700/50 hover:text-white' // Inativo: Cinza mais escuro
                    }`}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </nav>

      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        {!isLoading && role ? (
            <div className="mb-3 px-2 text-xs text-slate-400 uppercase font-semibold tracking-wider flex justify-between items-center">
                <span>PERFIL:</span>
                <span className={role === 'ADMIN' ? 'text-blue-400' : 'text-slate-300'}>
                  {role}
                </span>
            </div>
        ) : (
           !isLoading && <div className="mb-3 px-2 text-xs text-red-400">Sem Permissão</div>
        )}
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 w-full p-2 rounded hover:bg-slate-700/80 transition-colors"
        >
          <LogOut size={16} />
          Sair do Sistema
        </button>
      </div>
    </aside>
  )
}