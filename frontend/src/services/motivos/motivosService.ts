import { apiClient } from '../api/client'
import {
  MotivoIndisponibilidade,
  MotivoIndisponibilidadeCreatePayload,
  MotivoIndisponibilidadeUpdatePayload,
  ConfiguracaoSistema,
} from '@/types/motivos'

export const motivosService = {
  // --- Motivos de Indisponibilidade ---
  async listarMotivos(apenasAtivos = false): Promise<MotivoIndisponibilidade[]> {
    const response = await apiClient.get<MotivoIndisponibilidade[]>(
      '/api/v1/operacao/motivos-indisponibilidade',
      {
        params: { apenas_ativos: apenasAtivos },
      }
    )
    return response.data
  },

  async criarMotivo(
    payload: MotivoIndisponibilidadeCreatePayload
  ): Promise<MotivoIndisponibilidade> {
    const response = await apiClient.post<MotivoIndisponibilidade>(
      '/api/v1/operacao/motivos-indisponibilidade',
      payload
    )
    return response.data
  },

  async atualizarMotivo(
    motivoId: string,
    payload: MotivoIndisponibilidadeUpdatePayload
  ): Promise<MotivoIndisponibilidade> {
    const response = await apiClient.put<MotivoIndisponibilidade>(
      `/api/v1/operacao/motivos-indisponibilidade/${motivoId}`,
      payload
    )
    return response.data
  },

  // --- Configurações do Sistema ---
  async listarConfiguracoes(): Promise<ConfiguracaoSistema[]> {
    const response = await apiClient.get<ConfiguracaoSistema[]>('/api/v1/operacao/configuracoes')
    return response.data
  },

  async obterConfiguracao(chave: string): Promise<ConfiguracaoSistema> {
    const response = await apiClient.get<ConfiguracaoSistema>(`/api/v1/operacao/configuracoes/${chave}`)
    return response.data
  },

  async atualizarConfiguracao(chave: string, valor: string): Promise<ConfiguracaoSistema> {
    const response = await apiClient.put<ConfiguracaoSistema>(`/api/v1/operacao/configuracoes/${chave}`, {
      valor,
    })
    return response.data
  },
}
