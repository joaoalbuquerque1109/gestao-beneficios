/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { 
  LayoutDashboard, Users, FileSpreadsheet, Calculator, 
  History, LogOut, Settings as SettingsIcon, CheckCircle, Scale, Activity 
} from 'lucide-react'
import { useState, useEffect } from 'react'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [role, setRole] = useState<string>('Administrador') // Padrão temporário

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.replace('/login')
  }

  const navItems = [
    { label: 'Resumo', path: '/', icon: LayoutDashboard },
    { label: 'Funcionários', path: '/employees', icon: Users },
    { label: 'Movimentações', path: '/movements', icon: Activity },
    { label: 'Faltas', path: '/absences', icon: FileSpreadsheet },
    { label: 'Apuração', path: '/calculation', icon: Calculator },
    { label: 'Aprovação', path: '/approval', icon: CheckCircle },
    { label: 'Auditoria', path: '/audit', icon: History },
  ]

  // Exemplo de regra visual de permissão
  if (role === 'Administrador') {
    navItems.splice(5, 0, { label: 'Ajustes', path: '/adjustments', icon: Scale })
    navItems.push({ label: 'Configurações', path: '/settings', icon: SettingsIcon })
  }

  return (
    <aside className="w-64 bg-slate-800 text-white hidden md:flex flex-col h-screen fixed left-0 top-0 overflow-y-auto z-50">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="text-blue-400">Vale</span>Gestão
        </h1>
        <p className="text-xs text-slate-400 mt-1">Sistema Integrado RH</p>
      </div>

      <nav className="flex-1 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-blue-600 text-white border-r-4 border-blue-300' 
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 w-full p-2 rounded hover:bg-slate-700 transition"
        >
          <LogOut size={16} />
          Sair do Sistema
        </button>
      </div>
    </aside>
  )
}