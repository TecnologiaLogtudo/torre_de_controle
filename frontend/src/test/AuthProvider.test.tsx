import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthProvider, useAuth } from '@/app/providers/AuthProvider'
import { authService } from '@/services/auth/authService'
import { storage } from '@/utils/storage'

// Componente de teste consumidor do contexto
const TestConsumer: React.FC = () => {
  const { user, isAuthenticated, loading, error, login, logout } = useAuth()

  if (loading) return <div>Carregando teste...</div>

  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'Autenticado' : 'Não Autenticado'}</div>
      <div data-testid="user-name">{user?.nome || 'Sem Usuário'}</div>
      {error && <div data-testid="auth-error">{error}</div>}
      <button
        onClick={() => login({ email: 'test@logtudo.com', senha: '123' })}
        data-testid="btn-login"
      >
        Fazer Login
      </button>
      <button onClick={logout} data-testid="btn-logout">
        Logout
      </button>
    </div>
  )
}

describe('AuthProvider & Contexto de Autenticação', () => {
  beforeEach(() => {
    storage.removeToken()
    vi.restoreAllMocks()
  })

  it('deve inicializar como não autenticado quando não houver token no storage', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Não Autenticado')
    })
    expect(screen.getByTestId('user-name')).toHaveTextContent('Sem Usuário')
  })

  it('deve restaurar usuário via /auth/me se existir token válido no storage', async () => {
    storage.setToken('valid_token')
    vi.spyOn(authService, 'getMe').mockResolvedValueOnce({
      id: 'uuid-1',
      nome: 'Felipe Teste',
      email: 'test@logtudo.com',
      ativo: true,
      criado_em: '2026-08-21T00:00:00Z',
      atualizado_em: '2026-08-21T00:00:00Z',
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Autenticado')
    })
    expect(screen.getByTestId('user-name')).toHaveTextContent('Felipe Teste')
  })

  it('deve realizar login com sucesso, armazenar token e atualizar o estado', async () => {
    vi.spyOn(authService, 'login').mockResolvedValueOnce({
      token_acesso: 'token_login_sucesso',
      tipo_token: 'bearer',
    })
    vi.spyOn(authService, 'getMe').mockResolvedValueOnce({
      id: 'uuid-1',
      nome: 'Felipe Login',
      email: 'test@logtudo.com',
      ativo: true,
      criado_em: '2026-08-21T00:00:00Z',
      atualizado_em: '2026-08-21T00:00:00Z',
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Não Autenticado')
    })

    fireEvent.click(screen.getByTestId('btn-login'))

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Autenticado')
    })
    expect(screen.getByTestId('user-name')).toHaveTextContent('Felipe Login')
    expect(storage.getToken()).toBe('token_login_sucesso')
  })

  it('deve realizar logout e remover token', async () => {
    storage.setToken('token_para_logout')
    vi.spyOn(authService, 'getMe').mockResolvedValueOnce({
      id: 'uuid-1',
      nome: 'Felipe Logout',
      email: 'test@logtudo.com',
      ativo: true,
      criado_em: '2026-08-21T00:00:00Z',
      atualizado_em: '2026-08-21T00:00:00Z',
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Autenticado')
    })

    fireEvent.click(screen.getByTestId('btn-logout'))

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Não Autenticado')
    expect(storage.getToken()).toBeNull()
  })
})
