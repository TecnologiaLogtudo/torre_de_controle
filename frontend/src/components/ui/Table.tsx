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
}

export const TableHeadCell: React.FC<TableHeadCellProps> = ({ children, className = '' }) => {
  return (
    <th className={`px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-slate-500 whitespace-nowrap ${className}`}>
      {children}
    </th>
  )
}

export interface TableCellProps {
  children: React.ReactNode
  className?: string
  colSpan?: number
}

export const TableCell: React.FC<TableCellProps> = ({ children, className = '', colSpan }) => {
  return (
    <td colSpan={colSpan} className={`px-4 py-3 text-slate-700 ${className}`}>
      {children}
    </td>
  )
}
