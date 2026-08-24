export interface ResumoTorre {
  contratados: number
  total: number
  disponiveis: number
  programados: number
  em_rota: number
  indisponiveis: number
  vagas_nao_preenchidas: number
}

export interface ResumoEmpresaTorre extends ResumoTorre {
  empresa_id: string
  empresa_nome: string
  regras_capacidade: Record<string, number>
}

export interface DetalhamentoOperacional {
  empresa_id?: string | null
  empresa_nome?: string | null
  motorista_id: string
  motorista_nome: string
  veiculo_id: string
  veiculo_identificacao: string
  placa: string
  tipo_veiculo: string
  especialidade: string
  categoria: string
  status_operacional: string
  motivo_indisponibilidade?: string | null
  agendamento_id?: string | null
}

export interface EventoOperacional {
  id: string
  empresa_id: string
  motorista_id: string
  veiculo_id: string
  agendamento_id?: string | null
  categoria: string
  status_anterior: string
  novo_status: string
  motivo_indisponibilidade?: string | null
  usuario_id: string
  origem_alteracao?: string | null
  criado_em: string
}

export interface FiltrosDetalhamentoTorre {
  data?: string
  empresa_id?: string
  status?: string
  categoria?: string
  tipo_veiculo?: string
  especialidade?: string
  placa?: string
  motorista_nome?: string
  motorista_id?: string
  limite?: number
  offset?: number
}

export interface FiltrosHistoricoEventos {
  empresa_id?: string
  data_inicio?: string
  data_fim?: string
  motorista_id?: string
  veiculo_id?: string
  categoria?: string
  novo_status?: string
  motivo?: string
  usuario_id?: string
  limite?: number
  offset?: number
}

export interface ItemIgnoradoImportacao {
  linha: number
  placa: string
  motorista: string
  motivo: string
}

export interface ResultadoImportacao {
  total_linhas: number
  criados_veiculos: number
  criados_motoristas: number
  criadas_empresas: number
  vinculos_dedicados_criados: number
  ignorados_placa_existente: number
  itens_ignorados: ItemIgnoradoImportacao[]
}

