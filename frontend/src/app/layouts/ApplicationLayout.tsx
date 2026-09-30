import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from '@/components/navigation/Header'
import { Sidebar } from '@/components/navigation/Sidebar'

export const ApplicationLayout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      {/* Sidebar Desktop Fixa */}
      <div className="hidden md:block fixed inset-y-0 left-0 w-64 z-30">
        <Sidebar />
      </div>

      {/* Sidebar Mobile Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-10 h-full">
            <Sidebar onCloseMobile={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Layout Conteúdo Principal compensando a largura da sidebar fixa */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        <Header onToggleMobileSidebar={() => setMobileSidebarOpen(true)} />

        <main className="flex-1 p-4 md:p-6 bg-slate-100">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
