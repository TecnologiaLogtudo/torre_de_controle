/**
 * Camada isolada para gerenciamento do token JWT da sessão.
 * 
 * Decisão Arquitetural (Fase 4.1):
 * - Armazenamento persistente na sessão via localStorage através desta camada centralizada.
 * - Não armazena senhas nem dados sensíveis adicionais.
 * - Encapsula a chave de armazenamento em um único local (STORAGE_KEYS.ACCESS_TOKEN).
 * - Arquitetura preparada para receber Refresh Token no futuro (adicionando getRefreshToken/setRefreshToken nesta mesma interface).
 */

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'logtudo_access_token',
} as const

export const storage = {
  getToken(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    } catch {
      return null
    }
  },

  setToken(token: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token)
    } catch (e) {
      console.error('Erro ao armazenar o token JWT no storage:', e)
    }
  },

  removeToken(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    } catch (e) {
      console.error('Erro ao remover o token JWT do storage:', e)
    }
  },
}
