import { AxiosError } from 'axios'
import { ApiError } from '@/types/api'
export type { ApiError }

export function parseApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error
  }

  if (isAxiosError(error)) {
    const status = error.response?.status
    const data = error.response?.data as { detail?: string | Array<{ msg?: string; loc?: string[] }>; message?: string } | undefined

    let detailMessage = ''
    if (typeof data?.detail === 'string') {
      detailMessage = data.detail
    } else if (Array.isArray(data?.detail) && data.detail.length > 0) {
      // Formata erros de validação do Pydantic (422)
      detailMessage = data.detail.map(err => err.msg || 'Campo inválido').join('; ')
    } else if (data?.message) {
      detailMessage = data.message
    }

    switch (status) {
      case 400:
        return {
          statusCode: 400,
          message: detailMessage || 'Solicitação inválida. Verifique as informações enviadas.',
          detail: detailMessage,
          raw: error,
        }
      case 401:
        return {
          statusCode: 401,
          message: detailMessage || 'Sessão expirada ou credenciais inválidas. Por favor, faça login novamente.',
          detail: detailMessage,
          raw: error,
        }
      case 403:
        return {
          statusCode: 403,
          message: detailMessage || 'Você não tem permissão para realizar esta ação.',
          detail: detailMessage,
          raw: error,
        }
      case 404:
        return {
          statusCode: 404,
          message: detailMessage || 'O recurso solicitado não foi encontrado no sistema.',
          detail: detailMessage,
          raw: error,
        }
      case 409:
        return {
          statusCode: 409,
          message: detailMessage || 'Conflito de dados. O recurso já existe ou está em uso.',
          detail: detailMessage,
          raw: error,
        }
      case 422:
        return {
          statusCode: 422,
          message: detailMessage || 'Dados de entrada inválidos. Verifique os campos preenchidos.',
          detail: detailMessage,
          raw: error,
        }
      default:
        if (status && status >= 500) {
          return {
            statusCode: status,
            message: 'Ocorreu uma falha no servidor. Tente novamente mais tarde.',
            detail: detailMessage,
            raw: error,
          }
        }
        if (error.code === 'ERR_NETWORK') {
          return {
            statusCode: 0,
            message: 'Não foi possível se conectar ao servidor da Torre de Controle. Verifique sua conexão ou se o backend está em execução.',
            raw: error,
          }
        }
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      raw: error,
    }
  }

  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>
    const detail = typeof obj.detail === 'string' ? obj.detail : undefined
    const message = typeof obj.message === 'string' ? obj.message : undefined
    if (detail || message) {
      return {
        statusCode: typeof obj.statusCode === 'number' ? obj.statusCode : undefined,
        message: message || detail || 'Ocorreu um erro ao processar sua requisição.',
        detail,
        raw: error,
      }
    }
  }

  return {
    message: 'Ocorreu um erro inesperado ao processar sua requisição.',
    raw: error,
  }
}

export function isAxiosError(error: unknown): error is AxiosError {
  return typeof error === 'object' && error !== null && 'isAxiosError' in error
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  )
}

export const MSG_ERRO_INESPERADO_PADRAO = 'Ocorreu um erro inesperado ao processar sua requisição.'

export function getErrorMessage(error: unknown, fallback = MSG_ERRO_INESPERADO_PADRAO): string {
  if (!error) return fallback
  if (isApiError(error)) {
    if (error.detail) return error.detail
    if (error.message && error.message !== MSG_ERRO_INESPERADO_PADRAO) return error.message
    return fallback
  }
  const parsed = parseApiError(error)
  if (parsed.detail) return parsed.detail
  if (parsed.message && parsed.message !== MSG_ERRO_INESPERADO_PADRAO) return parsed.message
  return fallback
}
