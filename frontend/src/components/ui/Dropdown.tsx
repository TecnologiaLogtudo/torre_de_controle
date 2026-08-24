import React, { useState, useRef, useEffect } from 'react'

export interface DropdownItem {
  label: string
  onClick: () => void
  icon?: React.ReactNode
  danger?: boolean
  disabled?: boolean
}

export interface DropdownProps {
  trigger: React.ReactNode
  items: DropdownItem[]
  align?: 'left' | 'right'
}

export const Dropdown: React.FC<DropdownProps> = ({ trigger, items, align = 'right' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-2 w-48 rounded-lg bg-slate-900 border border-slate-800 shadow-xl z-50 py-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-100`}
        >
          {items.map((item, index) => (
            <button
              key={index}
              disabled={item.disabled}
              onClick={() => {
                item.onClick()
                setIsOpen(false)
              }}
              className={`w-full text-left px-4 py-2 text-xs font-medium flex items-center gap-2 transition-colors ${
                item.danger
                  ? 'text-red-400 hover:bg-red-950/40 hover:text-red-300'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {item.icon && <span className="w-4 h-4">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
