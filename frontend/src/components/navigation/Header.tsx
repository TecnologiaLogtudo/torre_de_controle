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
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      {/* Esquerda: Botão Mobile + Nome do Sistema */}
      <div className="flex items-center gap-4">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-none hover:bg-slate-100 border border-slate-200"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-sky-700" />
          <span className="font-semibold text-xs text-slate-800 tracking-wide uppercase font-mono hidden sm:inline">
            Torre de Controle Logtudo
          </span>
        </div>
      </div>

      {/* Direita: Usuário Autenticado + Profile Menu */}
      <div className="flex items-center gap-4">
        {/* Menu do Usuário */}
        {user && (
          <Dropdown
            trigger={
              <button className="flex items-center gap-2.5 p-1 rounded-none hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 text-left">
                <div className="w-7 h-7 rounded-none bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-800 font-mono font-bold text-xs">
                  {user.nome ? user.nome.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-semibold text-slate-800 leading-tight">
                    {user.nome}
                  </span>
                  <span className="text-[11px] text-slate-500 leading-tight font-mono">
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
