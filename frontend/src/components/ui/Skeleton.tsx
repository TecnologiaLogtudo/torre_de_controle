import React from 'react'

export interface SkeletonProps {
  className?: string
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse rounded bg-slate-800/80 ${className}`}
      role="status"
      aria-label="Carregando..."
    />
  )
}
