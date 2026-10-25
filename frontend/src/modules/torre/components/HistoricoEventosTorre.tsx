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
          <div className="h-12 bg-slate-100 animate-pulse rounded-none" />
        </div>
      ) : eventos.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-none border border-slate-200">
          Nenhum evento operacional registrado para esta seleção.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
          {eventos.map(ev => (
            <div
              key={ev.id}
              className="p-3 bg-slate-50 border border-slate-200 rounded-none flex flex-col gap-2 text-xs shadow-sm hover:bg-slate-100/80 transition-colors"
            >
              {/* Cabeçalho do Card de Evento */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span className="font-mono text-[11px] text-sky-700 font-bold">
                    {formatToBahia(ev.criado_em)}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="font-bold text-slate-800 uppercase tracking-wide text-[10px]">
                    {ev.categoria}
                  </span>
                </div>
                <div className="shrink-0">
                  <StatusBadge status={ev.novo_status} size="sm" />
                </div>
              </div>

              {/* Corpo do Card de Evento */}
              <div className="space-y-1">
                {ev.motorista_nome && (
                  <div className="font-semibold text-slate-900 truncate" title={ev.motorista_nome}>
                    {ev.motorista_nome}
                  </div>
                )}
                <div className="text-slate-700 text-[11px] leading-relaxed">
                  Transição de <span className="font-mono text-slate-500 font-medium">{ev.status_anterior}</span> para{' '}
                  <span className="font-mono font-bold text-slate-900">{ev.novo_status}</span>
                </div>
                {ev.motivo_indisponibilidade && (
                  <div className="text-rose-700 text-[11px] font-semibold">
                    Motivo: <strong>{ev.motivo_indisponibilidade}</strong>
                  </div>
                )}
                {ev.usuario_nome && (
                  <div className="text-slate-500 text-[10px] flex items-center gap-1 pt-0.5">
                    <User className="w-3 h-3 text-sky-600 shrink-0" />
                    <span>Alterado por: <strong className="text-slate-700">{ev.usuario_nome}</strong></span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
