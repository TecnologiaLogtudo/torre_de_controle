import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authService } from '@/services/auth/authService'
import { apiClient } from '@/services/api/client'

describe('Serviço de Autenticação (authService)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('deve realizar login chamando POST /api/v1/auth/login e retornar token_acesso', async () => {
    const mockResponse = { data: { token_acesso: 'jwt_secret_token', tipo_token: 'bearer' } }
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce(mockResponse)

    const result = await authService.login({ email: 'admin@logtudo.com', senha: '123' })
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/login', {
      email: 'admin@logtudo.com',
      senha: '123',
    })
    expect(result.token_acesso).toBe('jwt_secret_token')
  })

  it('deve buscar usuário logado via GET /api/v1/auth/me', async () => {
    const mockUser = {
      id: 'e6b8c9d0-1234-4567-89ab-cdef01234567',
      nome: 'Felipe Operador',
      email: 'felipe@logtudo.com',
      ativo: true,
      criado_em: '2026-08-21T10:00:00Z',
      atualizado_em: '2026-08-21T10:00:00Z',
    }
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: mockUser })

    const user = await authService.getMe()
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/auth/me')
    expect(user.nome).toBe('Felipe Operador')
  })
})
