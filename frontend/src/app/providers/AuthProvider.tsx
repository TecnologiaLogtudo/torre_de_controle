import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { AuthState, LoginPayload } from '@/types/auth'
import { Usuario } from '@/types/user'
import { ApiError } from '@/types/api'
import { authService } from '@/services/auth/authService'
import { storage } from '@/utils/storage'
import { setOnUnauthorizedHandler } from '@/services/api/client'

interface AuthContextType extends AuthState {
  login: (payload: LoginPayload) => Promise<void>
  logout: () => void
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: storage.getToken(),
    loading: true,
    error: null,
  })

  const logout = useCallback(() => {
    storage.removeToken()
    setState({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
      error: null,
    })
  }, [])

  // Registra o handler para 401 Unauthorized vindo dos interceptors HTTP
  useEffect(() => {
    setOnUnauthorizedHandler(() => {
      logout()
    })
  }, [logout])

  // Tenta restaurar a sessão ao carregar a aplicação
  useEffect(() => {
    const initAuth = async () => {
      const token = storage.getToken()
      if (!token) {
        setState(prev => ({ ...prev, loading: false }))
        return
      }

      try {
        const user = await authService.getMe()
        setState({
          isAuthenticated: true,
          user,
          token,
          loading: false,
          error: null,
        })
      } catch {
        // Se o token for inválido ou /auth/me falhar, limpa a sessão
        storage.removeToken()
        setState({
          isAuthenticated: false,
          user: null,
          token: null,
          loading: false,
          error: null,
        })
      }
    }

    initAuth()
  }, [])

  const login = async (payload: LoginPayload) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const response = await authService.login(payload)
      const token = response.token_acesso

      storage.setToken(token)

      // Busca dados completos do usuário recém-autenticado
      const user: Usuario = await authService.getMe()

      setState({
        isAuthenticated: true,
        user,
        token,
        loading: false,
        error: null,
      })
    } catch (err) {
      storage.removeToken()
      const apiError = err as ApiError
      setState({
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: apiError.message || 'Erro ao realizar login.',
      })
      throw apiError
    }
  }

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }))
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider')
  }
  return context
}
