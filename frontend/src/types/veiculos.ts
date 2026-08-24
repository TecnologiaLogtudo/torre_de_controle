export type EspecialidadeVeiculo = 'SECO' | 'REFRIGERADO'

export interface Veiculo {
  id: string
  identificacao: string
  placa: string
  tipo_veiculo: string
  especialidade: EspecialidadeVeiculo
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface VeiculoCreatePayload {
  identificacao: string
  placa: string
  tipo_veiculo: string
  especialidade: EspecialidadeVeiculo
}

export interface VeiculoUpdatePayload {
  identificacao: string
  placa: string
  tipo_veiculo: string
  especialidade: EspecialidadeVeiculo
  ativo: boolean
}
