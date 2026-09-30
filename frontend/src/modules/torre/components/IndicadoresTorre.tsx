import React from 'react'
import { ResumoTorre } from '@/types/torre'
import { CheckCircle2, Clock, Truck, AlertTriangle, Building2, UserX } from 'lucide-react'

export interface IndicadoresTorreProps {
  resumo: ResumoTorre | null
  isLoading: boolean
  empresaNome?: string
}

export const IndicadoresTorre: React.FC<IndicadoresTorreProps> = ({ resumo, isLoading, empresaNome }) => {
  if (isLoading || !resumo) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-200/80 animate-pulse rounded-none border border-slate-300" />
        ))}
      </div>
    )
  }

  const cards = [
    {
      label: 'Contratados',
      value: resumo.contratados,
      description: 'Capacidade total acordada',
      icon: <Building2 className="w-4 h-4 text-slate-500 shrink-0" />,
      border: 'border-slate-200 border-t-slate-600',
      text: 'text-slate-900',
    },
    {
      label: 'Programados',
      value: resumo.programados,
      description: 'Recursos em janela de saída',
      icon: <Clock className="w-4 h-4 text-sky-600 shrink-0" />,
      border: 'border-slate-200 border-t-sky-600',
      text: 'text-sky-700',
    },
    {
      label: 'Em Rota',
      value: resumo.em_rota,
      description: 'Recursos em trânsito',
      icon: <Truck className="w-4 h-4 text-amber-600 shrink-0" />,
      border: 'border-slate-200 border-t-amber-600',
      text: 'text-amber-700',
    },
    {
      label: 'Disponíveis',
      value: resumo.disponiveis,
      description: 'Prontos para alocação',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
      border: 'border-slate-200 border-t-emerald-600',
      text: 'text-emerald-700',
    },
    {
      label: 'Indisponíveis',
      value: resumo.indisponiveis,
      description: 'Com justificativa operacional',
      icon: <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />,
      border: 'border-slate-200 border-t-rose-600',
      text: 'text-rose-700',
    },
    {
      label: 'Vagas Livres',
      value: resumo.vagas_nao_preenchidas,
      description: 'Diferença de capacidade',
      icon: <UserX className="w-4 h-4 text-slate-500 shrink-0" />,
      border: 'border-slate-200 border-t-slate-400',
      text: 'text-slate-600',
    },
  ]

  return (
    <div className="space-y-3">
      {empresaNome && (
        <div className="px-3.5 py-2 bg-sky-50 border border-sky-200 rounded-none text-xs text-sky-800 flex items-center gap-2 font-mono">
          <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
          <span>Filtro de Empresa Ativo: <strong>{empresaNome}</strong></span>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-none border border-t-2 bg-white shadow-sm ${card.border} flex flex-col justify-between transition-colors`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {card.label}
              </span>
              {card.icon}
            </div>
            <div>
              <div className={`text-2xl font-bold ${card.text} font-mono tracking-tight`}>
                {card.value}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-tight">{card.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
