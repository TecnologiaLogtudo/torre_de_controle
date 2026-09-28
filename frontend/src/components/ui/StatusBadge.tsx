import React from 'react'
import { StatusOperacional } from '@/types/agendamentos'
import { CheckCircle2, Clock, Truck, AlertTriangle } from 'lucide-react'

interface StatusBadgeProps {
  status: StatusOperacional | string
  size?: 'sm' | 'md'
  showIcon?: boolean
  className?: string
  onClick?: (e: React.MouseEvent<HTMLSpanElement>) => void
  title?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = '',
  onClick,
  title,
}) => {
  const config: Record<
    string,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    DISPONIVEL: {
      label: 'Disponível',
      bg: 'bg-emerald-950/60',
      text: 'text-emerald-400',
      border: 'border-emerald-800/60',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
    },
    PROGRAMADO: {
      label: 'Programado',
      bg: 'bg-blue-950/60',
      text: 'text-blue-400',
      border: 'border-blue-800/60',
      icon: <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />,
    },
    EM_ROTA: {
      label: 'Em Rota',
      bg: 'bg-amber-950/60',
      text: 'text-amber-400',
      border: 'border-amber-800/60',
      icon: <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
    },
    INDISPONIVEL: {
      label: 'Indisponível',
      bg: 'bg-red-950/60',
      text: 'text-red-400',
      border: 'border-red-800/60',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />,
    },
    ATIVO: {
      label: 'Ativo',
      bg: 'bg-emerald-950/60',
      text: 'text-emerald-400',
      border: 'border-emerald-800/60',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
    },
    INATIVO: {
      label: 'Inativo',
      bg: 'bg-red-950/60',
      text: 'text-red-400',
      border: 'border-red-800/60',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />,
    },
    SECO: {
      label: 'Seco',
      bg: 'bg-red-950/40',
      text: 'text-red-500 font-bold',
      border: 'border-red-800/40',
      icon: null,
    },
    REFRIGERADO: {
      label: 'Refrigerado',
      bg: 'bg-blue-950/40',
      text: 'text-blue-500 font-bold',
      border: 'border-blue-800/40',
      icon: null,
    },
  }

  const current = config[status.toUpperCase()] || {
    label: status,
    bg: 'bg-slate-800/60',
    text: 'text-slate-300',
    border: 'border-slate-700/60',
    icon: null,
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  }

  const interactiveClasses = onClick
    ? 'cursor-pointer hover:opacity-80 active:scale-95 transition-all select-none'
    : ''

  return (
    <span
      aria-label={`Status: ${current.label}`}
      title={title}
      onClick={onClick}
      className={`inline-flex items-center font-semibold rounded-md border ${current.bg} ${current.text} ${current.border} ${sizeClasses[size]} ${interactiveClasses} ${className}`}
    >
      {showIcon && current.icon}
      <span>{current.label}</span>
    </span>
  )
}

interface PerfilBadgeProps {
  perfil?: string | null
  className?: string
}

export const PerfilBadge: React.FC<PerfilBadgeProps> = ({ perfil, className = '' }) => {
  if (!perfil) return <span className={`text-slate-400 text-xs ${className}`}>-</span>

  const isSeco = perfil.toUpperCase() === 'SECO'
  const isRefrigerado = perfil.toUpperCase() === 'REFRIGERADO'

  if (isSeco) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold text-red-500 bg-red-950/30 border border-red-800/40 ${className}`}
      >
        Seco
      </span>
    )
  }

  if (isRefrigerado) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold text-blue-500 bg-blue-950/30 border border-blue-800/40 ${className}`}
      >
        Refrigerado
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-slate-300 bg-slate-800/50 border border-slate-700/50 ${className}`}
    >
      {perfil}
    </span>
  )
}
