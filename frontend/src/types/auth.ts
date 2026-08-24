import { Usuario } from './user'

export interface LoginPayload {
  email: string
  senha: string
}

export interface LoginResponse {
  token_acesso: string
  tipo_token: string
}

export interface AuthState {
  isAuthenticated: boolean
  user: Usuario | null
  token: string | null
  loading: boolean
  error: string | null
}
