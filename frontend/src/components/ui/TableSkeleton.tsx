import React from 'react'
import { Skeleton } from './Skeleton'

export interface TableSkeletonProps {
  /** Quantidade de linhas simuladas (padrão 5) */
  rows?: number
  className?: string
}

/**
 * Skeleton padronizado para tabelas de listagem.
 * Substitui os blocos ad-hoc de Skeleton duplicados em cada página,
 * garantindo densidade visual equivalente à tabela real.
 */
export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, className = '' }) => {
  return (
    <div
      role="status"
      aria-label="Carregando dados da tabela"
      className={`w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 divide-y divide-slate-800/60 ${className}`}
    >
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="px-3 py-3 flex items-center gap-4">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-24 hidden md:block" />
          <Skeleton className="h-3 w-16 hidden lg:block" />
        </div>
      ))}
    </div>
  )
}
