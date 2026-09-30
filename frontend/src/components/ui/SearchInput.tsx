import React from 'react'
import { Search, X } from 'lucide-react'

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Pesquisar...',
  className = '',
  ...props
}) => {
  return (
    <div className={`relative flex items-center w-full max-w-xs ${className}`}>
      <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-white border border-slate-300 rounded-none pl-8 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-500 transition-colors"
        {...props}
      />
      {value && onClear && (
        <button
          onClick={onClear}
          className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5"
          aria-label="Limpar pesquisa"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
