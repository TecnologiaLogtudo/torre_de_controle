import { EspecialidadeVeiculo } from './veiculos'

export interface CapacidadeItem {
  tipo_veiculo: string
  especialidade: EspecialidadeVeiculo
  quantidade: number
}

export interface ContratoConfiguracao {
  id: string
  empresa_id: string
  data_inicio: string
  data_fim?: string | null
  regras?: Record<string, number>
  capacidades?: CapacidadeItem[]
  criado_em: string
  atualizado_em: string
}

export interface ContratoConfiguracaoCreatePayload {
  data_inicio: string
  regras?: Record<string, number>
  capacidades?: CapacidadeItem[]
}

export interface MotoristaDedicadoVinculo {
  id: string
  empresa_id?: string | null
  motorista_id: string
  veiculo_id: string
  tipo_veiculo?: string
  categoria_operacional?: 'DEDICADO' | 'SPOT'
  categoria?: 'DEDICADO' | 'SPOT'
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface MotoristaDedicadoVinculoCreatePayload {
  empresa_id?: string | null
  motorista_id: string
  veiculo_id: string
  tipo_veiculo?: string
  categoria_operacional?: 'DEDICADO' | 'SPOT'
  categoria?: 'DEDICADO' | 'SPOT'
}

