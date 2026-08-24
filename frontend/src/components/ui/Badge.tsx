import React from 'react'

export type StatusVariant =
  | 'DISPONIVEL'
  | 'PROGRAMADO'
  | 'EM_ROTA'
  | 'INDISPONIVEL'
  | 'EM_BREVE'
  | 'NEUTRO'
  | 'SUCESSO'
  | 'ALERTA'
  | 'ERRO'

interface BadgeProps {
  variant?: StatusVariant
  children: React.ReactNode
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'NEUTRO',
  children,
  size = 'md',
  dot = false,
  className = '',
}) => {
  const variantStyles: Record<StatusVariant, { bg: string; text: string; border: string; dotColor: string }> = {
    DISPONIVEL: {
      bg: 'bg-emerald-950/60',
      text: 'text-emerald-400',
      border: 'border-emerald-800/60',
      dotColor: 'bg-emerald-500',
    },
    PROGRAMADO: {
      bg: 'bg-blue-950/60',
      text: 'text-blue-400',
      border: 'border-blue-800/60',
      dotColor: 'bg-blue-500',
    },
    EM_ROTA: {
      bg: 'bg-amber-950/60',
      text: 'text-amber-400',
      border: 'border-amber-800/60',
      dotColor: 'bg-amber-500',
    },
    INDISPONIVEL: {
      bg: 'bg-red-950/60',
      text: 'text-red-400',
      border: 'border-red-800/60',
      dotColor: 'bg-red-500',
    },
    EM_BREVE: {
      bg: 'bg-slate-800/80',
      text: 'text-slate-400',
      border: 'border-slate-700/60',
      dotColor: 'bg-slate-500',
    },
    NEUTRO: {
      bg: 'bg-slate-800/60',
      text: 'text-slate-300',
      border: 'border-slate-700/60',
      dotColor: 'bg-slate-400',
    },
    SUCESSO: {
      bg: 'bg-emerald-950/60',
      text: 'text-emerald-400',
      border: 'border-emerald-800/60',
      dotColor: 'bg-emerald-500',
    },
    ALERTA: {
      bg: 'bg-amber-950/60',
      text: 'text-amber-400',
      border: 'border-amber-800/60',
      dotColor: 'bg-amber-500',
    },
    ERRO: {
      bg: 'bg-red-950/60',
      text: 'text-red-400',
      border: 'border-red-800/60',
      dotColor: 'bg-red-500',
    },
  }

  const style = variantStyles[variant] || variantStyles.NEUTRO

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  }

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md border ${style.bg} ${style.text} ${style.border} ${sizeClasses[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${style.dotColor} animate-pulse`} />}
      {children}
    </span>
  )
}
