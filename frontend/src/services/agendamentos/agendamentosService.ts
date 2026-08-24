import { apiClient } from '../api/client'
import {
  Agendamento,
  AgendamentoCreatePayload,
  AgendamentoUpdatePayload,
  AgendamentoPaginadoResponse,
  AlocacaoOperacional,
  AlocacaoOperacionalCreatePayload,
  StatusOperacionalUpdatePayload,
  HistoricoAgendamento,
} from '@/types/agendamentos'

export interface ListarAgendamentosParams {
  empresa_id?: string
  data?: string
  status?: string
  limite?: number
  offset?: number
  paginado?: boolean
}

export const agendamentosService = {
  // --- Agendamentos ---
  async criar(payload: AgendamentoCreatePayload): Promise<Agendamento> {
    const response = await apiClient.post<Agendamento>('/api/v1/agendamentos', payload)
    return response.data
  },

  async listar(params: ListarAgendamentosParams = {}): Promise<Agendamento[] | AgendamentoPaginadoResponse> {
    const response = await apiClient.get<Agendamento[] | AgendamentoPaginadoResponse>('/api/v1/agendamentos', {
      params,
    })
    return response.data
  },

  async buscarPorId(id: string): Promise<Agendamento> {
    const response = await apiClient.get<Agendamento>(`/api/v1/agendamentos/${id}`)
    return response.data
  },

  async atualizar(id: string, payload: AgendamentoUpdatePayload): Promise<Agendamento> {
    const response = await apiClient.put<Agendamento>(`/api/v1/agendamentos/${id}`, payload)
    return response.data
  },

  async cancelar(id: string): Promise<Agendamento> {
    const response = await apiClient.post<Agendamento>(`/api/v1/agendamentos/${id}/cancelar`)
    return response.data
  },

  async obterHistorico(id: string): Promise<HistoricoAgendamento[]> {
    const response = await apiClient.get<HistoricoAgendamento[]>(`/api/v1/agendamentos/${id}/historico`)
    return response.data
  },

  // --- Alocações SPOT ---
  async adicionarSpot(agendamentoId: string, payload: AlocacaoOperacionalCreatePayload): Promise<AlocacaoOperacional> {
    const response = await apiClient.post<AlocacaoOperacional>(`/api/v1/agendamentos/${agendamentoId}/spots`, payload)
    return response.data
  },

  async substituirSpot(alocacaoId: string, payload: AlocacaoOperacionalCreatePayload): Promise<AlocacaoOperacional> {
    const response = await apiClient.post<AlocacaoOperacional>(
      `/api/v1/agendamentos/alocacoes/${alocacaoId}/substituir`,
      payload
    )
    return response.data
  },

  async removerSpot(alocacaoId: string): Promise<void> {
    await apiClient.delete(`/api/v1/agendamentos/alocacoes/${alocacaoId}`)
  },

  // --- Status Operacional ---
  async atualizarStatusOperacional(
    alocacaoId: string,
    payload: StatusOperacionalUpdatePayload
  ): Promise<AlocacaoOperacional> {
    const response = await apiClient.put<AlocacaoOperacional>(
      `/api/v1/agendamentos/alocacoes/${alocacaoId}/status`,
      payload
    )
    return response.data
  },
}
