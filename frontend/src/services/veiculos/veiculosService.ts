import { apiClient } from '../api/client'
import { Veiculo, VeiculoCreatePayload, VeiculoUpdatePayload } from '@/types/veiculos'

export const veiculosService = {
  async listar(limite = 50, offset = 0): Promise<Veiculo[]> {
    const response = await apiClient.get<Veiculo[]>('/api/v1/veiculos', {
      params: { limite, offset },
    })
    return response.data
  },

  async buscarPorId(id: string): Promise<Veiculo> {
    const response = await apiClient.get<Veiculo>(`/api/v1/veiculos/${id}`)
    return response.data
  },

  async criar(payload: VeiculoCreatePayload): Promise<Veiculo> {
    const response = await apiClient.post<Veiculo>('/api/v1/veiculos', payload)
    return response.data
  },

  async atualizar(id: string, payload: VeiculoUpdatePayload): Promise<Veiculo> {
    const response = await apiClient.put<Veiculo>(`/api/v1/veiculos/${id}`, payload)
    return response.data
  },
}
