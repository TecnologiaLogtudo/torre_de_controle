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
          <div key={i} className="h-24 bg-logtudo-surface/40 animate-pulse rounded-xl border border-logtudo-border/40" />
        ))}
      </div>
    )
  }

  const cards = [
    {
      label: 'Contratados',
      value: resumo.contratados,
      description: 'Capacidade total acordada',
      icon: <Building2 className="w-5 h-5 text-logtudo-accent shrink-0" />,
      border: 'border-logtudo-primary/60',
      bg: 'bg-logtudo-surface/80',
      text: 'text-logtudo-accent',
    },
    {
      label: 'Programados',
      value: resumo.programados,
      description: 'Recursos em janela de saída',
      icon: <Clock className="w-5 h-5 text-blue-400 shrink-0" />,
      border: 'border-blue-800/60',
      bg: 'bg-blue-950/40',
      text: 'text-blue-400',
    },
    {
      label: 'Em Rota',
      value: resumo.em_rota,
      description: 'Recursos em trânsito operacional',
      icon: <Truck className="w-5 h-5 text-amber-400 shrink-0" />,
      border: 'border-amber-800/60',
      bg: 'bg-amber-950/40',
      text: 'text-amber-400',
    },
    {
      label: 'Disponíveis',
      value: resumo.disponiveis,
      description: 'Recursos prontos para alocação',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
      border: 'border-emerald-800/60',
      bg: 'bg-emerald-950/40',
      text: 'text-emerald-400',
    },
    {
      label: 'Indisponíveis',
      value: resumo.indisponiveis,
      description: 'Com justificativa operacional',
      icon: <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />,
      border: 'border-red-800/60',
      bg: 'bg-red-950/40',
      text: 'text-red-400',
    },
    {
      label: 'Vagas Não Preenchidas',
      value: resumo.vagas_nao_preenchidas,
      description: 'Diferença de capacidade',
      icon: <UserX className="w-5 h-5 text-slate-400 shrink-0" />,
      border: 'border-slate-700/60',
      bg: 'bg-slate-900/60',
      text: 'text-slate-300',
    },
  ]

  return (
    <div className="space-y-2">
      {empresaNome && (
        <div className="px-3 py-1.5 bg-sky-950/60 border border-sky-800/60 rounded-lg text-xs text-sky-300 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-sky-400 shrink-0" />
          <span>Filtro de Empresa Ativo: <strong>{empresaNome}</strong> (Indicadores executivos refinados)</span>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`p-4 rounded-xl border ${card.border} ${card.bg} flex flex-col justify-between backdrop-blur-sm transition-all hover:scale-[1.01]`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {card.label}
            </span>
            {card.icon}
          </div>
          <div>
            <div className={`text-2xl font-extrabold ${card.text} font-mono`}>
              {card.value}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{card.description}</p>
          </div>
        </div>
      ))}
      </div>
    </div>
  )
}
