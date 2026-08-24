export type StatusOperacional = 'DISPONIVEL' | 'PROGRAMADO' | 'EM_ROTA' | 'INDISPONIVEL'
export type CategoriaAlocacao = 'DEDICADO' | 'SPOT'

export interface AlocacaoOperacional {
  id: string
  agendamento_id: string
  motorista_id: string
  veiculo_id: string
  categoria: CategoriaAlocacao
  status_operacional: StatusOperacional
  motivo_indisponibilidade_id?: string | null
  criado_em: string
  atualizado_em: string
}

export interface AlocacaoOperacionalCreatePayload {
  motorista_id: string
  veiculo_id: string
  categoria: CategoriaAlocacao
}

export interface StatusOperacionalUpdatePayload {
  novo_status: StatusOperacional
  motivo_indisponibilidade_id?: string | null
  origem_alteracao?: string
}

export interface Agendamento {
  id: string
  empresa_id: string
  data: string
  horario_inicio: string
  status: string
  criado_por_id: string
  contrato_configuracao_id?: string | null
  alocacoes: AlocacaoOperacional[]
  criado_em: string
  atualizado_em: string
}

export interface AgendamentoCreatePayload {
  empresa_id: string
  data: string
  horario_inicio?: string
}

export interface AgendamentoUpdatePayload {
  horario_inicio?: string | null
  status?: string | null
}

export interface HistoricoAgendamento {
  id: string
  agendamento_id: string
  alterado_por_id: string
  tipo_alteracao: string
  descricao: string
  criado_em: string
}

export interface AgendamentoPaginadoResponse {
  items: Agendamento[]
  total: number
  limite: number
  offset: number
}
