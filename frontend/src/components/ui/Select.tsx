import React, { forwardRef } from 'react'

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
  containerClassName?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', containerClassName = '', id, value, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    // Se className possui classes de largura ou flex, repassamos para o wrapper caso containerClassName não seja explicitamente passado
    const hasExplicitWidth = /\bw-(\d+|auto|full|fit|px|\d+\/\d+|[a-z]+)\b/.test(className)
    const wrapperWidth = containerClassName || (hasExplicitWidth ? '' : 'w-full')

    return (
      <div className={`flex flex-col gap-1 ${wrapperWidth} ${containerClassName}`}>
        {label && (
          <label htmlFor={selectId} className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          value={value}
          className={`w-full bg-white border ${
            error ? 'border-rose-500 focus:border-rose-600' : 'border-slate-300 focus:border-sky-600 focus:ring-1 focus:ring-sky-500'
          } rounded-none text-xs text-slate-900 transition-colors focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed px-2.5 py-1.5 ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="">
              {placeholder}
            </option>
          )}
          {options.map(opt => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span className="text-xs font-medium text-rose-600">{error}</span>}
      </div>
    )
  }
)

Select.displayName = 'Select'

