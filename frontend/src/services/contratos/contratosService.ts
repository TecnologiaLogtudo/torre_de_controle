import { apiClient } from '../api/client'
import {
  ContratoConfiguracao,
  ContratoConfiguracaoCreatePayload,
  MotoristaDedicadoVinculo,
  MotoristaDedicadoVinculoCreatePayload,
} from '@/types/contratos'

export const contratosService = {
  // --- Configurações de Capacidade Contratual ---
  async criarConfiguracao(
    empresaId: string,
    payload: ContratoConfiguracaoCreatePayload
  ): Promise<ContratoConfiguracao> {
    const regrasMap: Record<string, number> = { ...(payload.regras || {}) }
    if (payload.capacidades && Object.keys(regrasMap).length === 0) {
      payload.capacidades.forEach(cap => {
        regrasMap[cap.tipo_veiculo] = (regrasMap[cap.tipo_veiculo] || 0) + cap.quantidade
      })
    }

    const response = await apiClient.post<ContratoConfiguracao>(
      `/api/v1/empresas/${empresaId}/configuracoes`,
      {
        data_inicio: payload.data_inicio,
        regras: regrasMap,
        capacidades: payload.capacidades,
      }
    )
    return response.data
  },

  async obterHistoricoConfiguracoes(empresaId: string): Promise<ContratoConfiguracao[]> {
    const response = await apiClient.get<ContratoConfiguracao[]>(
      `/api/v1/empresas/${empresaId}/configuracoes`
    )
    return response.data
  },

  async obterConfiguracaoVigente(
    empresaId: string,
    dataReferencia?: string
  ): Promise<ContratoConfiguracao> {
    const response = await apiClient.get<ContratoConfiguracao>(
      `/api/v1/empresas/${empresaId}/configuracoes/vigente`,
      {
        params: dataReferencia ? { data: dataReferencia } : undefined,
      }
    )
    return response.data
  },

  // --- Vínculos de Motoristas/Veículos Dedicados ---
  async criarVinculoDedicado(
    payload: MotoristaDedicadoVinculoCreatePayload
  ): Promise<MotoristaDedicadoVinculo> {
    const response = await apiClient.post<MotoristaDedicadoVinculo>(
      '/api/v1/motoristas/dedicados/vinculos',
      {
        empresa_id: payload.empresa_id,
        motorista_id: payload.motorista_id,
        veiculo_id: payload.veiculo_id,
        tipo_veiculo: payload.tipo_veiculo,
        categoria_operacional: payload.categoria_operacional || payload.categoria || 'DEDICADO',
        categoria: payload.categoria || payload.categoria_operacional || 'DEDICADO',
      }
    )
    return response.data
  },

  async listarVinculosAtivos(limite = 50, offset = 0): Promise<MotoristaDedicadoVinculo[]> {
    const response = await apiClient.get<MotoristaDedicadoVinculo[]>(
      '/api/v1/motoristas/dedicados/vinculos',
      {
        params: { limite, offset },
      }
    )
    return response.data
  },

  async desativarVinculoDedicado(vinculoId: string): Promise<MotoristaDedicadoVinculo> {
    const response = await apiClient.post<MotoristaDedicadoVinculo>(
      `/api/v1/motoristas/dedicados/vinculos/${vinculoId}/desativar`
    )
    return response.data
  },
}
