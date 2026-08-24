import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Radio,
  Truck,
  UserCheck,
  Building2,
  FileText,
  Calendar,
  Activity,
  Users,
  Settings,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import { Badge } from '../ui/Badge'
import logoOfficial from '@/Identidade visual/Logos/Variações do Logo_Prancheta 1-01.png'
import textureBg from '@/Identidade visual/Texturas/texturas_Prancheta 1-02.png'

interface NavGroup {
  groupName?: string
  items: {
    name: string
    path: string
    icon: React.ReactNode
    status: 'active' | 'soon'
    children?: {
      name: string
      path: string
      icon: React.ReactNode
      status: 'active' | 'soon'
    }[]
  }[]
}

const navigationStructure: NavGroup[] = [
  {
    items: [
      {
        name: 'Torre de Controle',
        path: '/app/torre',
        icon: <Radio className="w-4 h-4 text-logtudo-accent" />,
        status: 'active',
      },
      {
        name: 'Operação',
        path: '/app/operacao',
        icon: <Activity className="w-4 h-4 text-amber-400" />,
        status: 'active',
      },
      {
        name: 'Agendamentos',
        path: '/app/agendamentos',
        icon: <Calendar className="w-4 h-4 text-sky-400" />,
        status: 'active',
      },
    ],
  },
  {
    groupName: 'Gestão & Cadastros',
    items: [
      {
        name: 'Cadastros',
        path: '/app/cadastros',
        icon: <Building2 className="w-4 h-4 text-purple-400" />,
        status: 'active',
        children: [
          {
            name: 'Empresas',
            path: '/app/empresas',
            icon: <Building2 className="w-3.5 h-3.5 text-purple-400" />,
            status: 'active',
          },
          {
            name: 'Motoristas',
            path: '/app/motoristas',
            icon: <UserCheck className="w-3.5 h-3.5 text-emerald-400" />,
            status: 'active',
          },
          {
            name: 'Veículos',
            path: '/app/veiculos',
            icon: <Truck className="w-3.5 h-3.5 text-indigo-400" />,
            status: 'active',
          },
        ],
      },
      {
        name: 'Contratos & Capacidade',
        path: '/app/contratos',
        icon: <FileText className="w-4 h-4 text-teal-400" />,
        status: 'active',
      },
    ],
  },
  {
    groupName: 'Administração',
    items: [
      {
        name: 'Configurações',
        path: '/app/configuracoes',
        icon: <Settings className="w-4 h-4 text-slate-400" />,
        status: 'active',
        children: [
          {
            name: 'Usuários',
            path: '/app/usuarios',
            icon: <Users className="w-3.5 h-3.5 text-pink-400" />,
            status: 'active',
          },
          {
            name: 'Motivos Indisponibilidade',
            path: '/app/configuracoes/motivos-indisponibilidade',
            icon: <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />,
            status: 'active',
          },
        ],
      },
    ],
  },
]

export const Sidebar: React.FC<{ onCloseMobile?: () => void }> = ({ onCloseMobile }) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Cadastros: true,
    Configurações: true,
  })

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }))
  }

  return (
    <aside className="w-64 bg-logtudo-deep border-r border-logtudo-border/60 flex flex-col shrink-0 min-h-screen relative overflow-hidden">
      {/* Camada sutil de textura da marca no fundo da barra lateral */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5 mix-blend-overlay bg-cover"
        style={{ backgroundImage: `url(${textureBg})` }}
      />

      {/* Logotipo Oficial da Logtudo */}
      <div className="h-20 flex items-center px-4 border-b border-logtudo-border/60 bg-logtudo-deep/90 relative z-10">
        <img
          src={logoOfficial}
          alt="Logtudo Logo Oficial"
          className="h-12 w-auto object-contain max-w-full drop-shadow"
        />
      </div>

      {/* Navegação Hierárquica */}
      <div className="flex-1 py-4 px-3 space-y-4 overflow-y-auto relative z-10">
        {navigationStructure.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {group.groupName && (
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-logtudo-accent/80 mb-1">
                {group.groupName}
              </div>
            )}

            {group.items.map(item => {
              const hasChildren = item.children && item.children.length > 0
              const isSoon = item.status === 'soon'

              if (hasChildren) {
                const isOpen = !!expandedGroups[item.name]

                return (
                  <div key={item.name} className="space-y-1">
                    <button
                      onClick={() => toggleGroup(item.name)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-200 hover:bg-logtudo-surface/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span>{item.name}</span>
                      </div>
                      {isOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="pl-6 space-y-1 border-l border-logtudo-border/50 ml-4">
                        {item.children!.map(child => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            onClick={onCloseMobile}
                            className={({ isActive }) =>
                              `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                isActive
                                  ? 'bg-logtudo-primary text-white border border-logtudo-accent/40 font-semibold shadow-md'
                                  : 'text-slate-300 hover:bg-logtudo-surface/60 hover:text-white'
                              }`
                            }
                          >
                            <div className="flex items-center gap-2">
                              {child.icon}
                              <span>{child.name}</span>
                            </div>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <NavLink
                  key={item.path}
                  to={isSoon ? '#' : item.path}
                  onClick={e => {
                    if (isSoon) {
                      e.preventDefault()
                    } else if (onCloseMobile) {
                      onCloseMobile()
                    }
                  }}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive && !isSoon
                        ? 'bg-logtudo-primary text-white border border-logtudo-accent/40 font-semibold shadow-md'
                        : isSoon
                        ? 'text-slate-500 cursor-not-allowed hover:bg-logtudo-surface/20'
                        : 'text-slate-300 hover:bg-logtudo-surface/60 hover:text-white'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className="shrink-0">{item.icon}</span>
                    <span>{item.name}</span>
                  </div>

                  {isSoon && (
                    <Badge variant="EM_BREVE" size="sm">
                      Em breve
                    </Badge>
                  )}
                </NavLink>
              )
            })}
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-logtudo-border/60 text-[11px] text-slate-400 flex flex-col gap-1 bg-logtudo-deep/80 relative z-10">
        <div className="flex items-center justify-between">
          <span>Timezone:</span>
          <span className="font-semibold text-logtudo-accent">America/Bahia</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Operação:</span>
          <span className="font-semibold text-emerald-400">Fase 4.2 Ativa</span>
        </div>
      </div>
    </aside>
  )
}
