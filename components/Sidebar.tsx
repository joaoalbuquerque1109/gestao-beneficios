/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { 
  LayoutDashboard, Users, FileSpreadsheet, Calculator, 
  History, LogOut, Settings as SettingsIcon, CheckCircle, Scale, Activity, 
  Loader2, UserCog, X, Menu, ChevronLeft
} from 'lucide-react'
import { useState, useEffect, ComponentType, SVGProps } from 'react'

// --- TIPOS ---
type NavItem = {
  label: string
  path: string
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>
  allowed: string[]
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  
  const [role, setRole] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // --- ESTADOS DO MODO GMAIL (Apenas Desktop) ---
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // Expande visualmente se não estiver colapsado OU se o mouse estiver em cima
  const isVisualExpanded = !isCollapsed || isHovered

  useEffect(() => {
    const getUserProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.email) {
          setUserEmail(session.user.email)
          const { data: profile } = await supabase
            .from('user_profiles').select('role')
            .ilike('email', session.user.email).single()
          
          if (profile?.role) setRole(profile.role.toUpperCase())
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

  const getInitials = (email: string) => email.substring(0, 2).toUpperCase()

  const allNavItems: NavItem[] = [
    { label: 'Visão Geral', path: '/', icon: LayoutDashboard, allowed: ['USER', 'RH', 'ADMIN'] },
    { label: 'Funcionários', path: '/employees', icon: Users, allowed: ['USER', 'RH', 'ADMIN'] },
    { label: 'Movimentações', path: '/movements', icon: Activity, allowed: ['RH', 'ADMIN'] },
    { label: 'Faltas e Ausências', path: '/absences', icon: FileSpreadsheet, allowed: ['USER', 'RH', 'ADMIN'] },
    { label: 'Apuração Mensal', path: '/calculation', icon: Calculator, allowed: ['USER', 'RH', 'ADMIN'] },
    { label: 'Aprovação', path: '/approval', icon: CheckCircle, allowed: ['RH', 'ADMIN'] },
    { label: 'Auditoria', path: '/audit', icon: History, allowed: ['ADMIN'] },
    { label: 'Ajustes Financeiros', path: '/adjustments', icon: Scale, allowed: ['ADMIN'] },
    { label: 'Configurações', path: '/settings', icon: SettingsIcon, allowed: ['ADMIN'] },
    { label: 'Usuários', path: '/settings/users', icon: UserCog, allowed: ['ADMIN'] },
  ]

  const filteredNavItems = isLoading || !role ? [] : allNavItems.filter(item => item.allowed.includes(role))

  return (
    <>
      {/* 1. OVERLAY (Aparece em Mobile E Tablet - Telas < LG) */}
      <div 
        className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* 2. SIDEBAR CONTAINER */}
      <aside 
        className={`
          z-50 h-full shrink-0 transition-all duration-300 ease-in-out
          
          /* MOBILE & TABLET (< lg): Gaveta Fixa */
          fixed inset-y-0 left-0 
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          
          /* DESKTOP (> lg): Rail Sidebar Relativa */
          lg:translate-x-0 lg:relative 
          ${isCollapsed ? 'lg:w-20' : 'lg:w-72'}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        
        {/* 3. CONTEÚDO VISUAL */}
        <div className={`
            h-full bg-slate-900 border-r border-slate-800 flex flex-col shadow-xl overflow-hidden
            transition-all duration-300 ease-in-out
            
            /* Mobile/Tablet: Largura fixa da gaveta */
            w-72
            
            /* Desktop: Flutuante Absoluta (para efeito hover sem empurrar layout) */
            lg:absolute lg:top-0 lg:left-0 lg:bottom-0
            ${isVisualExpanded ? 'lg:w-72' : 'lg:w-20'}
        `}>

            {/* HEADER */}
            <div className="h-20 flex items-center px-4 border-b border-slate-800 shrink-0">
              
              {/* Botão Hambúrguer (Apenas Desktop LG+) */}
              <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 mr-2"
                title={isCollapsed ? "Fixar Menu" : "Recolher Menu"}
              >
                <Menu size={24} />
              </button>

              {/* Logo (Lógica Híbrida) */}
              <div className={`flex items-center gap-3 overflow-hidden transition-all duration-300 
                  /* Desktop: Controlado pelo hover/collapse */
                  lg:${isVisualExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}
                  /* Mobile/Tablet: Sempre visível na gaveta */
                  opacity-100 w-auto
              `}>
                <div className="whitespace-nowrap">
                    <h1 className="text-lg font-bold text-slate-100 tracking-tight leading-none">
                      Vale<span className="text-blue-500">Gestão</span>
                    </h1>
                </div>
              </div>

              {/* Botão Fechar (Visível em Mobile E Tablet < LG) */}
              <button onClick={onClose} className="lg:hidden ml-auto text-slate-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* NAVEGAÇÃO */}
            <nav className="flex-1 overflow-y-auto py-6 space-y-1 custom-scrollbar overflow-x-hidden">
              <ul className="space-y-1.5 px-3">
                {filteredNavItems.map((item) => {
                  const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
                  
                  return (
                    <li key={item.path}>
                      <Link
                        href={item.path}
                        onClick={onClose} 
                        className={`
                          group flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative whitespace-nowrap
                          ${isActive 
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                          }
                        `}
                      >
                        <item.icon 
                          size={20} 
                          className={`transition-colors shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`} 
                        />
                        
                        <span className={`
                            transition-all duration-300 origin-left ml-4
                            /* Desktop Logic */
                            lg:${isVisualExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}
                            /* Mobile/Tablet Logic: Sempre visível */
                            opacity-100 w-auto
                        `}>
                            {item.label}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>

            {/* FOOTER */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 shrink-0 overflow-hidden">
              {!isLoading && role && userEmail && (
                <div className={`
                    flex items-center p-2 rounded-xl transition-all 
                    lg:${isVisualExpanded ? 'hover:bg-slate-800' : 'justify-start'}
                `}>
                    <div className="w-9 h-9 shrink-0 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-bold border border-slate-700">
                      {getInitials(userEmail)}
                    </div>

                    <div className={`
                        flex-1 min-w-0 ml-3 transition-all duration-300 
                        /* Desktop Logic */
                        lg:${isVisualExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'}
                        /* Mobile/Tablet Logic */
                        opacity-100 w-auto
                    `}>
                      <p className="text-sm font-medium text-slate-200 truncate">{userEmail.split('@')[0]}</p>
                      <button onClick={handleLogout} className="text-[10px] text-red-400 hover:text-red-300 uppercase font-bold flex items-center gap-1 mt-1">
                        Sair <LogOut size={12} />
                      </button>
                    </div>
                </div>
              )}
            </div>
        </div>
      </aside>
    </>
  )
}