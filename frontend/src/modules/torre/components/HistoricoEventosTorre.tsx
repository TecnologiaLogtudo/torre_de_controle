import React from 'react'
import { EventoOperacional } from '@/types/torre'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatToBahia } from '@/utils/date'
import { Activity, User } from 'lucide-react'

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
      className="bg-white border-slate-200 shadow-sm"
    >
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-12 bg-slate-100 animate-pulse rounded-none" />
          <div className="h-12 bg-slate-100 animate-pulse rounded-none" />
        </div>
      ) : eventos.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-none border border-slate-200">
          Nenhum evento operacional registrado para esta seleção.
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {eventos.map(ev => (
            <div
              key={ev.id}
              className="p-3 bg-slate-50 border border-slate-200 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm hover:bg-slate-100/80 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Activity className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-mono text-[11px] text-sky-700 font-bold">
                      {formatToBahia(ev.criado_em)}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="font-bold text-slate-800 uppercase tracking-wide">
                      {ev.categoria}
                    </span>
                    {ev.motorista_nome && (
                      <>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-900 font-semibold">{ev.motorista_nome}</span>
                      </>
                    )}
                  </div>
                  <div className="text-slate-700">
                    Transição de <span className="font-mono text-slate-500 font-medium">{ev.status_anterior}</span> para{' '}
                    <span className="font-mono font-bold text-slate-900">{ev.novo_status}</span>
                    {ev.motivo_indisponibilidade && (
                      <span className="text-rose-700 font-semibold block mt-0.5">
                        Motivo: <strong>{ev.motivo_indisponibilidade}</strong>
                      </span>
                    )}
                    {ev.usuario_nome && (
                      <span className="text-slate-500 text-[11px] flex items-center gap-1 mt-1">
                        <User className="w-3 h-3 text-sky-600 shrink-0" />
                        Alterado por: <strong className="text-slate-700">{ev.usuario_nome}</strong>
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

