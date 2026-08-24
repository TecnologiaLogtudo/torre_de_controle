import { apiClient } from '../api/client'
import { Motorista, MotoristaCreatePayload, MotoristaUpdatePayload } from '@/types/motoristas'

export const motoristasService = {
  async listar(limite = 50, offset = 0): Promise<Motorista[]> {
    const response = await apiClient.get<Motorista[]>('/api/v1/motoristas', {
      params: { limite, offset },
    })
    return response.data
  },

  async buscarPorId(id: string): Promise<Motorista> {
    const response = await apiClient.get<Motorista>(`/api/v1/motoristas/${id}`)
    return response.data
  },

  async criar(payload: MotoristaCreatePayload): Promise<Motorista> {
    const response = await apiClient.post<Motorista>('/api/v1/motoristas', payload)
    return response.data
  },

  async atualizar(id: string, payload: MotoristaUpdatePayload): Promise<Motorista> {
    const response = await apiClient.put<Motorista>(`/api/v1/motoristas/${id}`, payload)
    return response.data
  },
}
