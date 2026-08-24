import React from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Dropdown } from '../ui/Dropdown'
import { User, LogOut, Radio, Menu } from 'lucide-react'

export const Header: React.FC<{ onToggleMobileSidebar?: () => void }> = ({
  onToggleMobileSidebar,
}) => {
  const { user, logout } = useAuth()

  const dropdownItems = [
    {
      label: 'Meu Perfil',
      icon: <User className="w-4 h-4" />,
      onClick: () => {
        // Reservado para futuras fases
      },
    },
    {
      label: 'Sair do Sistema',
      icon: <LogOut className="w-4 h-4" />,
      danger: true,
      onClick: logout,
    },
  ]

  return (
    <header className="h-16 bg-slate-950 border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Esquerda: Botão Mobile + Nome do Sistema */}
      <div className="flex items-center gap-4">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-sky-400 animate-pulse" />
          <span className="font-semibold text-sm text-slate-200 hidden sm:inline">
            Torre de Controle Logtudo
          </span>
        </div>
      </div>

      {/* Direita: Usuário Autenticado + Profile Menu */}
      <div className="flex items-center gap-4">
        {/* Status Operacional da API */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-emerald-950/40 border border-emerald-800/40 rounded-full text-xs text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-medium">API Conectada</span>
        </div>

        {/* Menu do Usuário */}
        {user && (
          <Dropdown
            trigger={
              <button className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-slate-900 transition-colors border border-transparent hover:border-slate-800 text-left">
                <div className="w-8 h-8 rounded-full bg-sky-950 border border-sky-700/60 flex items-center justify-center text-sky-300 font-bold text-xs">
                  {user.nome ? user.nome.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-semibold text-slate-200 leading-tight">
                    {user.nome}
                  </span>
                  <span className="text-[11px] text-slate-400 leading-tight">
                    {user.email}
                  </span>
                </div>
              </button>
            }
            items={dropdownItems}
          />
        )}
      </div>
    </header>
  )
}
