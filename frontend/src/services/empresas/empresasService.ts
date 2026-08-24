import { apiClient } from '../api/client'
import { Empresa, EmpresaCreatePayload, EmpresaUpdatePayload } from '@/types/empresas'

export const empresasService = {
  async listar(limite = 50, offset = 0): Promise<Empresa[]> {
    const response = await apiClient.get<Empresa[]>('/api/v1/empresas', {
      params: { limite, offset },
    })
    return response.data
  },

  async buscarPorId(id: string): Promise<Empresa> {
    const response = await apiClient.get<Empresa>(`/api/v1/empresas/${id}`)
    return response.data
  },

  async criar(payload: EmpresaCreatePayload): Promise<Empresa> {
    const response = await apiClient.post<Empresa>('/api/v1/empresas', payload)
    return response.data
  },

  async atualizar(id: string, payload: EmpresaUpdatePayload): Promise<Empresa> {
    const response = await apiClient.put<Empresa>(`/api/v1/empresas/${id}`, payload)
    return response.data
  },
}
