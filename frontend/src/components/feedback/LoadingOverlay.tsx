import React from 'react'
import { Spinner } from '../ui/Spinner'

export interface LoadingOverlayProps {
  message?: string
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = 'Carregando dados...' }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-2xl flex flex-col items-center gap-3 text-center">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-slate-200">{message}</p>
      </div>
    </div>
  )
}
