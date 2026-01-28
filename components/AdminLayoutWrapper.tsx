'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import Image from 'next/image'

export default function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {/* Área Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* --- CABEÇALHO MOBILE/TABLET --- */}
        {/* CORREÇÃO AQUI: Mudado de md:hidden para lg:hidden */}
        <header className="lg:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
            <div className="flex items-center gap-3">
                {/* Botão Hamburguer */}
                <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                    <Menu size={24} />
                </button>
                <span className="font-semibold text-slate-700">Menu</span>
            </div>

            {/* Ações Mobile (Logo/Avatar) */}
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs border border-blue-200">
                    <Image 
                        src="/favicon.ico" 
                        alt="Logo" 
                        width={20} 
                        height={20} 
                        className="object-contain"
                    />
                </div>
            </div>
        </header>

        {/* Conteúdo da Página */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  )
}