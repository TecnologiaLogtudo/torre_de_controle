import React from 'react'
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react'

export type AlertType = 'info' | 'success' | 'warning' | 'error'

export interface AlertProps {
  type?: AlertType
  title?: string
  children: React.ReactNode
  onClose?: () => void
  className?: string
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  onClose,
  className = '',
}) => {
  const typeConfig: Record<AlertType, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
    info: {
      bg: 'bg-sky-950/40',
      border: 'border-sky-800/60',
      text: 'text-sky-300',
      icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
    },
    success: {
      bg: 'bg-emerald-950/40',
      border: 'border-emerald-800/60',
      text: 'text-emerald-300',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-950/40',
      border: 'border-amber-800/60',
      text: 'text-amber-300',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    },
    error: {
      bg: 'bg-red-950/40',
      border: 'border-red-800/60',
      text: 'text-red-300',
      icon: <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />,
    },
  }

  const config = typeConfig[type]

  return (
    <div className={`flex items-start gap-3 p-4 border rounded-lg ${config.bg} ${config.border} ${config.text} ${className}`}>
      {config.icon}
      <div className="flex-1 text-sm">
        {title && <h4 className="font-semibold mb-0.5">{title}</h4>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors p-0.5"
          aria-label="Fechar alerta"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
