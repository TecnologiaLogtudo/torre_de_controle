import React from 'react'
import { EventoOperacional } from '@/types/torre'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatToBahia } from '@/utils/date'
import { Activity } from 'lucide-react'

export interface HistoricoEventosTorreProps {
  eventos: EventoOperacional[]
  isLoading: boolean
  empresaNome?: string
}

export const HistoricoEventosTorre: React.FC<HistoricoEventosTorreProps> = ({ eventos, isLoading, empresaNome }) => {
  return (
    <Card
      title="Feed de Eventos Operacionais Imutáveis"
      subtitle={
        empresaNome
          ? `Trilha histórica de transições de status da empresa ${empresaNome} (America/Bahia)`
          : 'Trilha histórica de transições de status registradas no fuso horário oficial America/Bahia'
      }
      className="bg-logtudo-surface/40 border-logtudo-border/60"
    >
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-12 bg-logtudo-surface/40 animate-pulse rounded-lg" />
          <div className="h-12 bg-logtudo-surface/40 animate-pulse rounded-lg" />
        </div>
      ) : eventos.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400 bg-logtudo-deep/40 rounded-lg border border-dashed border-logtudo-border/60">
          Nenhum evento operacional registrado para esta seleção.
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {eventos.map(ev => (
            <div
              key={ev.id}
              className="p-3 bg-logtudo-deep/80 border border-logtudo-border/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-3">
                <Activity className="w-4 h-4 text-logtudo-accent shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[11px] text-logtudo-accent font-bold">
                      {formatToBahia(ev.criado_em)}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="font-bold text-slate-200 uppercase tracking-wide">
                      {ev.categoria}
                    </span>
                  </div>
                  <div className="text-slate-300">
                    Transição de <span className="font-mono text-slate-400">{ev.status_anterior}</span> para{' '}
                    <span className="font-mono font-bold text-slate-100">{ev.novo_status}</span>
                    {ev.motivo_indisponibilidade && (
                      <span className="text-red-400 block mt-0.5">
                        Motivo: <strong>{ev.motivo_indisponibilidade}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={ev.novo_status} size="sm" />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
