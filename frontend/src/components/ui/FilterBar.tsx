import React from 'react'
import { Filter, RotateCcw } from 'lucide-react'
import { Button } from './Button'

export interface FilterBarProps {
  children: React.ReactNode
  onClearFilters?: () => void
  hasActiveFilters?: boolean
  className?: string
}

export const FilterBar: React.FC<FilterBarProps> = ({
  children,
  onClearFilters,
  hasActiveFilters = false,
  className = '',
}) => {
  return (
    <div className={`bg-white border border-slate-200 shadow-sm rounded-none p-3 flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-3 flex-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 shrink-0">
          <Filter className="w-3.5 h-3.5 text-sky-600" />
          <span>Filtros:</span>
        </div>
        {children}
      </div>

      {hasActiveFilters && onClearFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          leftIcon={<RotateCcw className="w-3 h-3 text-slate-500" />}
          className="text-xs text-slate-600 hover:text-slate-900"
        >
          Limpar Filtros
        </Button>
      )}
    </div>
  )
}
