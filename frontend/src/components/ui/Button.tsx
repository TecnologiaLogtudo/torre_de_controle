import React from 'react'
import { Spinner } from './Spinner'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-logtudo-accent/60 disabled:opacity-50 disabled:cursor-not-allowed select-none'

  const variantClasses = {
    primary: 'bg-logtudo-primary hover:bg-logtudo-hover text-white shadow-sm active:bg-logtudo-deep',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-logtudo-border',
    outline: 'bg-transparent hover:bg-logtudo-hover/40 text-slate-300 border border-logtudo-border',
    danger: 'bg-red-600 hover:bg-red-500 text-white shadow-sm active:bg-red-700',
    ghost: 'bg-transparent hover:bg-logtudo-hover/40 text-slate-300',
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  }

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Spinner size="sm" className="text-current" />
          <span>Aguarde...</span>
        </>
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  )
}
