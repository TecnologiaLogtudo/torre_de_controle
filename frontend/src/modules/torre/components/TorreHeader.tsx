import React from 'react'
import { Button } from '@/components/ui/Button'
import { formatDateBahia } from '@/utils/date'
import { RefreshCw, Clock } from 'lucide-react'

export interface TorreHeaderProps {
  dataFiltro: string
  onRefresh: () => void
  ultimaAtualizacao: string | null
  isLoading: boolean
}

export const TorreHeader: React.FC<TorreHeaderProps> = ({
  dataFiltro,
  onRefresh,
  ultimaAtualizacao,
  isLoading,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-white p-5 rounded-none border border-slate-200 shadow-sm">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Torre de Controle Operacional</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Monitoramento em tempo real da capacidade contratada, alocações e frota logística
        </p>
      </div>

      <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-slate-600">Hoje:</span>
            <span className="font-mono font-bold text-sky-800">{formatDateBahia(dataFiltro)}</span>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={onRefresh}
            isLoading={isLoading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Atualizar Dados
          </Button>
        </div>

        {ultimaAtualizacao && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
            <span>Última atualização: {ultimaAtualizacao}</span>
          </div>
        )}
      </div>
    </div>
  )
}
