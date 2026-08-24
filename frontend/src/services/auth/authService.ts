import { apiClient } from '../api/client'
import { LoginPayload, LoginResponse } from '@/types/auth'
import { Usuario } from '@/types/user'

export const authService = {
  /**
   * Realiza login no backend e obtém o token JWT.
   * Endpoint: POST /api/v1/auth/login
   */
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/api/v1/auth/login', payload)
    return response.data
  },

  /**
   * Obtém os dados do usuário autenticado a partir do token.
   * Endpoint: GET /api/v1/auth/me
   */
  async getMe(): Promise<Usuario> {
    const response = await apiClient.get<Usuario>('/api/v1/auth/me')
    return response.data
  },
}
