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
      bg: 'bg-emerald-100',
      text: 'text-emerald-900 font-bold',
      border: 'border-emerald-300',
      dotColor: 'bg-emerald-700',
    },
    PROGRAMADO: {
      bg: 'bg-sky-100',
      text: 'text-sky-900 font-bold',
      border: 'border-sky-300',
      dotColor: 'bg-sky-700',
    },
    EM_ROTA: {
      bg: 'bg-amber-100',
      text: 'text-amber-950 font-bold',
      border: 'border-amber-300',
      dotColor: 'bg-amber-700',
    },
    INDISPONIVEL: {
      bg: 'bg-rose-100',
      text: 'text-rose-950 font-bold',
      border: 'border-rose-300',
      dotColor: 'bg-rose-700',
    },
    EM_BREVE: {
      bg: 'bg-slate-200',
      text: 'text-slate-800 font-semibold',
      border: 'border-slate-300',
      dotColor: 'bg-slate-500',
    },
    NEUTRO: {
      bg: 'bg-slate-100',
      text: 'text-slate-800 font-semibold',
      border: 'border-slate-300',
      dotColor: 'bg-slate-500',
    },
    SUCESSO: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-900 font-bold',
      border: 'border-emerald-300',
      dotColor: 'bg-emerald-700',
    },
    ALERTA: {
      bg: 'bg-amber-100',
      text: 'text-amber-950 font-bold',
      border: 'border-amber-300',
      dotColor: 'bg-amber-700',
    },
    ERRO: {
      bg: 'bg-rose-100',
      text: 'text-rose-950 font-bold',
      border: 'border-rose-300',
      dotColor: 'bg-rose-700',
    },
  }

  const style = variantStyles[variant] || variantStyles.NEUTRO

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  }

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-none border ${style.bg} ${style.text} ${style.border} ${sizeClasses[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-none ${style.dotColor} animate-pulse`} />}
      {children}
    </span>
  )
}
