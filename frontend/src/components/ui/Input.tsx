import React, { forwardRef } from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  containerClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', containerClassName = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    // Se className possui classes de largura ou flex, repassamos para o wrapper caso containerClassName não seja explicitamente passado
    const hasExplicitWidth = /\bw-(\d+|auto|full|fit|px|\d+\/\d+|[a-z]+)\b/.test(className)
    const wrapperWidth = containerClassName || (hasExplicitWidth ? '' : 'w-full')

    return (
      <div className={`flex flex-col gap-1 ${wrapperWidth} ${containerClassName}`}>
        {label && (
          <label htmlFor={inputId} className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full bg-white border ${
              error ? 'border-rose-500 focus:border-rose-600' : 'border-slate-300 focus:border-sky-600 focus:ring-1 focus:ring-sky-500'
            } rounded-none text-xs text-slate-900 placeholder-slate-400 transition-colors focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${
              leftIcon ? 'pl-8' : 'pl-2.5'
            } ${rightIcon ? 'pr-8' : 'pr-2.5'} py-1.5 ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-slate-400 flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <span className="text-xs font-medium text-rose-600">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-slate-500">{helperText}</span>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'

