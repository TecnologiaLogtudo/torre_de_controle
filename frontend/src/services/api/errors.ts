import { AxiosError } from 'axios'
import { ApiError } from '@/types/api'

export function parseApiError(error: unknown): ApiError {
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

  return {
    message: 'Ocorreu um erro inesperado ao processar sua requisição.',
    raw: error,
  }
}

function isAxiosError(error: unknown): error is AxiosError {
  return typeof error === 'object' && error !== null && 'isAxiosError' in error
}
