import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { PublicOnlyRoute } from '@/app/router/PublicOnlyRoute'
import { storage } from '@/utils/storage'
import { authService } from '@/services/auth/authService'

describe('Proteção e Navegação de Rotas', () => {
  beforeEach(() => {
    storage.removeToken()
    vi.restoreAllMocks()
  })

  it('deve bloquear acesso à rota privada se o usuário NÃO estiver autenticado e redirecionar para /login', async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/app']}>
          <Routes>
            <Route path="/login" element={<div>Tela de Login Publica</div>} />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <div>Área Privada da Torre</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Tela de Login Publica')).toBeInTheDocument()
    })
    expect(screen.queryByText('Área Privada da Torre')).not.toBeInTheDocument()
  })

  it('deve permitir acesso à rota privada quando o usuário estiver autenticado', async () => {
    storage.setToken('token_autenticado')
    vi.spyOn(authService, 'getMe').mockResolvedValueOnce({
      id: 'uuid-1',
      nome: 'Felipe Autorizado',
      email: 'felipe@logtudo.com',
      ativo: true,
      criado_em: '2026-08-21T00:00:00Z',
      atualizado_em: '2026-08-21T00:00:00Z',
    })

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/app']}>
          <Routes>
            <Route path="/login" element={<div>Tela de Login Publica</div>} />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <div>Área Privada da Torre</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Área Privada da Torre')).toBeInTheDocument()
    })
    expect(screen.queryByText('Tela de Login Publica')).not.toBeInTheDocument()
  })

  it('deve redirecionar usuário autenticado que tentar acessar a tela de /login para /app', async () => {
    storage.setToken('token_autenticado')
    vi.spyOn(authService, 'getMe').mockResolvedValueOnce({
      id: 'uuid-1',
      nome: 'Felipe Logado',
      email: 'felipe@logtudo.com',
      ativo: true,
      criado_em: '2026-08-21T00:00:00Z',
      atualizado_em: '2026-08-21T00:00:00Z',
    })

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <div>Tela de Login Publica</div>
                </PublicOnlyRoute>
              }
            />
            <Route path="/app" element={<div>Área Principal /app</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Área Principal /app')).toBeInTheDocument()
    })
    expect(screen.queryByText('Tela de Login Publica')).not.toBeInTheDocument()
  })
})
