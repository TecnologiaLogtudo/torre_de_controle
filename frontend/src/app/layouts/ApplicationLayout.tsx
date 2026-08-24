import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from '@/components/navigation/Header'
import { Sidebar } from '@/components/navigation/Sidebar'

export const ApplicationLayout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Desktop */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Sidebar Mobile Overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative z-10">
              <Sidebar onCloseMobile={() => setMobileSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* Layout Conteúdo Principal */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header onToggleMobileSidebar={() => setMobileSidebarOpen(true)} />

          <main className="flex-1 p-6 overflow-y-auto bg-slate-900/90">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
