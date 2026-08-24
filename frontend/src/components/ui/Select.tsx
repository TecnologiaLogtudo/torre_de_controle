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
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', id, value, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          value={value}
          className={`w-full bg-slate-950 border ${
            error ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-800 focus:border-sky-500 focus:ring-sky-500/20'
          } rounded-lg text-sm text-slate-100 transition-colors focus:outline-none focus:ring-2 disabled:bg-slate-900 disabled:opacity-60 disabled:cursor-not-allowed px-3 py-2 ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map(opt => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span className="text-xs font-medium text-red-400">{error}</span>}
      </div>
    )
  }
)

Select.displayName = 'Select'
