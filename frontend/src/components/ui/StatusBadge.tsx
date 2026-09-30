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
      bg: 'bg-emerald-100',
      text: 'text-emerald-900 font-bold',
      border: 'border-emerald-300',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800 shrink-0" />,
    },
    PROGRAMADO: {
      label: 'Programado',
      bg: 'bg-sky-100',
      text: 'text-sky-900 font-bold',
      border: 'border-sky-300',
      icon: <Clock className="w-3.5 h-3.5 text-sky-800 shrink-0" />,
    },
    EM_ROTA: {
      label: 'Em Rota',
      bg: 'bg-amber-100',
      text: 'text-amber-950 font-bold',
      border: 'border-amber-300',
      icon: <Truck className="w-3.5 h-3.5 text-amber-800 shrink-0" />,
    },
    INDISPONIVEL: {
      label: 'Indisponível',
      bg: 'bg-rose-100',
      text: 'text-rose-950 font-bold',
      border: 'border-rose-300',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-700 shrink-0" />,
    },
    ATIVO: {
      label: 'Ativo',
      bg: 'bg-emerald-100',
      text: 'text-emerald-900 font-bold',
      border: 'border-emerald-300',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800 shrink-0" />,
    },
    INATIVO: {
      label: 'Inativo',
      bg: 'bg-slate-200',
      text: 'text-slate-900 font-bold',
      border: 'border-slate-400',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-slate-700 shrink-0" />,
    },
    SECO: {
      label: 'Seco',
      bg: 'bg-slate-100',
      text: 'text-slate-700 font-semibold',
      border: 'border-slate-200',
      icon: null,
    },
    REFRIGERADO: {
      label: 'Refrigerado',
      bg: 'bg-blue-50',
      text: 'text-blue-700 font-semibold',
      border: 'border-blue-200',
      icon: null,
    },
    CONGELADO: {
      label: 'Congelado',
      bg: 'bg-cyan-50',
      text: 'text-cyan-700 font-semibold',
      border: 'border-cyan-200',
      icon: null,
    },
    DEDICADO: {
      label: 'Dedicado',
      bg: 'bg-purple-50',
      text: 'text-purple-700 font-semibold',
      border: 'border-purple-200',
      icon: null,
    },
    SPOT: {
      label: 'Spot',
      bg: 'bg-teal-50',
      text: 'text-teal-700 font-semibold',
      border: 'border-teal-200',
      icon: null,
    },
  }

  const current = config[status.toUpperCase()] || {
    label: status,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
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
      className={`inline-flex items-center font-semibold rounded-none border ${current.bg} ${current.text} ${current.border} ${sizeClasses[size]} ${interactiveClasses} ${className}`}
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
  const isCongelado = perfil.toUpperCase() === 'CONGELADO'

  if (isSeco) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-none text-xs font-semibold text-red-500 bg-red-50 border border-red-200 ${className}`}
      >
        Seco
      </span>
    )
  }

  if (isRefrigerado) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-none text-xs font-semibold text-blue-500 bg-blue-50 border border-blue-200 ${className}`}
      >
        Refrigerado
      </span>
    )
  }

  if (isCongelado) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-none text-xs font-semibold text-cyan-700 bg-cyan-50 border border-cyan-200 ${className}`}
      >
        Congelado
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-none text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 ${className}`}
    >
      {perfil}
    </span>
  )
}
