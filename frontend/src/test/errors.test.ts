import { describe, it, expect } from 'vitest'
import { parseApiError, getErrorMessage, ApiError } from '@/services/api/errors'

describe('Serviço de Erros da API (errors.ts)', () => {
  it('deve extrair a mensagem detail de erro Axios 400', () => {
    const axiosErrorMock = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          detail: 'O motorista informado está marcado como INDISPONÍVEL.',
        },
      },
    }

    const parsed = parseApiError(axiosErrorMock)
    expect(parsed.statusCode).toBe(400)
    expect(parsed.detail).toBe('O motorista informado está marcado como INDISPONÍVEL.')
    expect(parsed.message).toBe('O motorista informado está marcado como INDISPONÍVEL.')

    const msg = getErrorMessage(axiosErrorMock)
    expect(msg).toBe('O motorista informado está marcado como INDISPONÍVEL.')
  })

  it('deve preservar mensagens quando o erro já foi parseado para ApiError pelo interceptor', () => {
    const apiError: ApiError = {
      statusCode: 400,
      message: 'O motorista informado já está alocado nesta mesma programação.',
      detail: 'O motorista informado já está alocado nesta mesma programação.',
    }

    const parsed = parseApiError(apiError)
    expect(parsed.detail).toBe('O motorista informado já está alocado nesta mesma programação.')
    expect(parsed.message).toBe('O motorista informado já está alocado nesta mesma programação.')

    const msg = getErrorMessage(apiError, 'Fallback genérico')
    expect(msg).toBe('O motorista informado já está alocado nesta mesma programação.')
  })

  it('deve formatar adequadamente erros de validação Pydantic 422', () => {
    const validationErrorMock = {
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          detail: [
            { msg: 'O campo motorista_id é obrigatório', loc: ['body', 'motorista_id'] },
            { msg: 'O campo veiculo_id é obrigatório', loc: ['body', 'veiculo_id'] },
          ],
        },
      },
    }

    const parsed = parseApiError(validationErrorMock)
    expect(parsed.statusCode).toBe(422)
    expect(parsed.message).toBe('O campo motorista_id é obrigatório; O campo veiculo_id é obrigatório')
    expect(getErrorMessage(validationErrorMock)).toBe('O campo motorista_id é obrigatório; O campo veiculo_id é obrigatório')
  })

  it('deve usar o fallback quando não houver detalhe ou mensagem no erro', () => {
    expect(getErrorMessage(null, 'Erro customizado')).toBe('Erro customizado')
    expect(getErrorMessage(undefined, 'Erro customizado')).toBe('Erro customizado')
    expect(getErrorMessage({}, 'Erro padrão')).toBe('Erro padrão')
  })
})
