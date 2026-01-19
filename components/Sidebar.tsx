'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { 
  LayoutDashboard, Users, FileSpreadsheet, Calculator, 
  History, LogOut, Settings as SettingsIcon, CheckCircle, Scale, Activity, Loader2, UserCog, X
} from 'lucide-react'
import { useState, useEffect, ComponentType, SVGProps } from 'react'

// --- TIPOS ---
type NavItem = {
  label: string
  path: string
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>
  allowed: string[]
}

// --- PROPS PARA SUPORTE MOBILE ---
interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
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
          const { data: profile } = await supabase
            .from('user_profiles') 
            .select('role')
            .ilike('email', session.user.email)
            .single()

          if (profile) setRole(profile.role)
          else console.warn('Perfil não encontrado.')
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

  // --- CONFIGURAÇÃO DO MENU ---
  const allNavItems: NavItem[] = [
    { label: 'Resumo', path: '/', icon: LayoutDashboard, allowed: ['USER', 'RH', 'ADMIN'] },
    { label: 'Funcionários', path: '/employees', icon: Users, allowed: ['USER', 'RH', 'ADMIN'] },
    { label: 'Movimentações', path: '/movements', icon: Activity, allowed: ['RH', 'ADMIN'] },
    { label: 'Faltas', path: '/absences', icon: FileSpreadsheet, allowed: ['USER', 'RH', 'ADMIN'] },
    { label: 'Apuração', path: '/calculation', icon: Calculator, allowed: ['USER', 'RH', 'ADMIN'] },
    { label: 'Aprovação', path: '/approval', icon: CheckCircle, allowed: ['RH', 'ADMIN'] },
    { label: 'Auditoria', path: '/audit', icon: History, allowed: ['ADMIN'] },
    { label: 'Ajustes', path: '/adjustments', icon: Scale, allowed: ['ADMIN'] },
    { label: 'Configurações', path: '/settings', icon: SettingsIcon, allowed: ['ADMIN'] },
    { label: 'Gestão de Usuários', path: '/settings/users', icon: UserCog, allowed: ['ADMIN'] },
  ]

  const filteredNavItems = isLoading || !role 
    ? [] 
    : allNavItems.filter(item => item.allowed.includes(role))

  return (
    <>
      {/* 1. OVERLAY MOBILE */}
      <div 
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity md:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* 2. SIDEBAR */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 text-white shadow-xl 
          transform transition-transform duration-300 ease-in-out flex flex-col h-full
          md:translate-x-0 md:static md:shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex justify-between items-center shrink-0">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
                <span className="text-blue-400">Vale</span>Gestão
            </h1>
            <p className="text-xs text-slate-400 mt-1">Sistema Integrado RH</p>
          </div>
          {/* Botão Fechar (Mobile Only) */}
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Navigation - AQUI ESTÁ A MÁGICA DO SCROLL ESCONDIDO */}
        <nav 
            className="flex-1 overflow-y-auto py-4 
            [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
        >
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
                      onClick={onClose} 
                      className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all duration-200 ${
                        isActive 
                          ? 'bg-slate-700 text-white border-r-4 border-blue-500' // Adicionei uma borda ativa para destaque extra
                          : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
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

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/50 shrink-0">
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
    </>
  )
}