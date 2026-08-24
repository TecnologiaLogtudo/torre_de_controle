import { describe, it, expect, beforeEach } from 'vitest'
import { storage } from '@/utils/storage'

describe('Utilitário de Armazenamento de Token (storage)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('deve armazenar e recuperar o token JWT corretamente', () => {
    expect(storage.getToken()).toBeNull()
    storage.setToken('mock_jwt_token_123')
    expect(storage.getToken()).toBe('mock_jwt_token_123')
  })

  it('deve remover o token JWT do localStorage', () => {
    storage.setToken('token_para_remover')
    expect(storage.getToken()).toBe('token_para_remover')
    storage.removeToken()
    expect(storage.getToken()).toBeNull()
  })
})
