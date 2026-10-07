import React from 'react'

export interface TableProps {
  children: React.ReactNode
  className?: string
}

export const Table: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <div className={`w-full overflow-x-auto rounded-none border border-slate-200 bg-white shadow-sm ${className}`}>
      <table className="w-full text-left border-collapse text-xs">{children}</table>
    </div>
  )
}

export interface TableHeaderProps {
  children: React.ReactNode
  className?: string
}

export const TableHeader: React.FC<TableHeaderProps> = ({ children, className = '' }) => {
  return <thead className={`bg-slate-50 border-b border-slate-200 ${className}`}>{children}</thead>
}

export interface TableBodyProps {
  children: React.ReactNode
  className?: string
}

export const TableBody: React.FC<TableBodyProps> = ({ children, className = '' }) => {
  return <tbody className={`divide-y divide-slate-100 ${className}`}>{children}</tbody>
}

export interface TableRowProps {
  children: React.ReactNode
  className?: string
  onClick?: (e: React.MouseEvent<HTMLTableRowElement>) => void
}

export const TableRow: React.FC<TableRowProps> = ({ children, className = '', onClick }) => {
  return (
    <tr
      onClick={onClick}
      className={`hover:bg-slate-50/80 transition-colors ${className}`}
    >
      {children}
    </tr>
  )
}

export interface TableHeadCellProps {
  children: React.ReactNode
  className?: string
  compact?: boolean
}

export const TableHeadCell: React.FC<TableHeadCellProps> = ({ children, className = '', compact = false }) => {
  return (
    <th className={`${compact ? 'px-2.5 py-1.5' : 'px-4 py-3'} font-semibold uppercase tracking-wider text-[11px] text-slate-500 whitespace-nowrap ${className}`}>
      {children}
    </th>
  )
}

export interface TableCellProps {
  children: React.ReactNode
  className?: string
  colSpan?: number
  compact?: boolean
}

export const TableCell: React.FC<TableCellProps> = ({ children, className = '', colSpan, compact = false }) => {
  return (
    <td colSpan={colSpan} className={`${compact ? 'px-2.5 py-1.5' : 'px-4 py-3'} text-slate-700 ${className}`}>
      {children}
    </td>
  )
}
