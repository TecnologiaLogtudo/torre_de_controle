import { apiClient } from '../api/client'
import {
  ResumoTorre,
  ResumoEmpresaTorre,
  DetalhamentoOperacional,
  EventoOperacional,
  FiltrosDetalhamentoTorre,
  FiltrosHistoricoEventos,
  ResultadoImportacao,
} from '@/types/torre'

export const torreService = {
  async obterResumoGeral(data?: string, empresa_id?: string): Promise<ResumoTorre> {
    const response = await apiClient.get<ResumoTorre>('/api/v1/operacao/torre/resumo', {
      params: {
        ...(data ? { data } : {}),
        ...(empresa_id ? { empresa_id } : {}),
      },
    })
    return response.data
  },

  async obterResumoPorEmpresa(data?: string): Promise<ResumoEmpresaTorre[]> {
    const response = await apiClient.get<ResumoEmpresaTorre[]>('/api/v1/operacao/torre/empresas-resumo', {
      params: data ? { data } : undefined,
    })
    return response.data
  },

  async obterDetalhamento(params: FiltrosDetalhamentoTorre = {}): Promise<DetalhamentoOperacional[]> {
    const response = await apiClient.get<DetalhamentoOperacional[]>('/api/v1/operacao/torre/detalhamento', {
      params,
    })
    return response.data
  },

  async listarHistoricoEventos(params: FiltrosHistoricoEventos = {}): Promise<EventoOperacional[]> {
    const response = await apiClient.get<EventoOperacional[]>('/api/v1/operacao/historico-eventos', {
      params,
    })
    return response.data
  },

  async importarPlanilha(file: File): Promise<ResultadoImportacao> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post<ResultadoImportacao>('/api/v1/operacao/importar-planilha', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
}
