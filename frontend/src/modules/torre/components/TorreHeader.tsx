import React from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { RefreshCw, Clock, Upload } from 'lucide-react'

export interface TorreHeaderProps {
  dataFiltro: string
  onDataChange: (data: string) => void
  onRefresh: () => void
  onOpenImport?: () => void
  ultimaAtualizacao: string | null
  isLoading: boolean
}

export const TorreHeader: React.FC<TorreHeaderProps> = ({
  dataFiltro,
  onDataChange,
  onRefresh,
  onOpenImport,
  ultimaAtualizacao,
  isLoading,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-logtudo-surface/40 p-4 rounded-xl border border-logtudo-border/60 backdrop-blur-sm">
      <PageHeader
        title="Torre de Controle Operacional"
        subtitle="Monitoramento em tempo real da capacidade contratada, alocações e frota logística"
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-40">
          <Input
            type="date"
            value={dataFiltro}
            onChange={e => onDataChange(e.target.value)}
            className="text-xs"
          />
        </div>

        {onOpenImport && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenImport}
            leftIcon={<Upload className="w-3.5 h-3.5" />}
          >
            Importar Planilha
          </Button>
        )}

        <Button
          variant="primary"
          size="sm"
          onClick={onRefresh}
          isLoading={isLoading}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          className="bg-logtudo-primary hover:bg-logtudo-hover text-white shadow-md"
        >
          Atualizar Dados
        </Button>

        {ultimaAtualizacao && (
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono bg-logtudo-deep/80 px-3 py-1.5 rounded-lg border border-logtudo-border/40">
            <Clock className="w-3.5 h-3.5 text-logtudo-accent shrink-0" />
            <span>Última atualização: {ultimaAtualizacao}</span>
          </div>
        )}
      </div>
    </div>
  )
}
