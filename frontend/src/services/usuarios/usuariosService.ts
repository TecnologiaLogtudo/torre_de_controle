import { apiClient } from '../api/client'
import { Usuario } from '@/types/user'

export interface UsuarioCreatePayload {
  nome: string
  email: string
  senha: string
  ativo?: boolean
}

export interface UsuarioUpdatePayload {
  nome?: string
  email?: string
  ativo?: boolean
}

export const usuariosService = {
  async listar(limite = 50, offset = 0): Promise<Usuario[]> {
    const response = await apiClient.get<Usuario[]>('/api/v1/usuarios', {
      params: { limite, offset },
    })
    return response.data
  },

  async buscarPorId(id: string): Promise<Usuario> {
    const response = await apiClient.get<Usuario>(`/api/v1/usuarios/${id}`)
    return response.data
  },

  async criar(payload: UsuarioCreatePayload): Promise<Usuario> {
    const response = await apiClient.post<Usuario>('/api/v1/usuarios', payload)
    return response.data
  },

  async atualizar(id: string, payload: UsuarioUpdatePayload): Promise<Usuario> {
    const response = await apiClient.put<Usuario>(`/api/v1/usuarios/${id}`, payload)
    return response.data
  },
}
