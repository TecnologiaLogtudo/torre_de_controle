/**
 * Utilitário oficial de timezone para a Torre de Controle Logtudo.
 * 
 * Regra:
 * Timezone oficial do sistema: America/Bahia (UTC-3 sem horário de verão).
 * Os timestamps recebidos do backend (UTC) devem ser exibidos formatados no fuso de America/Bahia.
 */

export const TIMEZONE_OFICIAL = 'America/Bahia'

/**
 * Remove propriedades com valor undefined de um objeto de opções.
 */
function cleanDefinedOptions(opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(opts)) {
    if (value !== undefined) {
      result[key] = value
    }
  }
  return result as Intl.DateTimeFormatOptions
}

/**
 * Formata um timestamp (string ISO UTC ou objeto Date) no fuso horário America/Bahia.
 * Trata conflito entre dateStyle/timeStyle e opções de componentes individuais do Intl.DateTimeFormat.
 */
export function formatToBahia(
  dateInput: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return '-'

  try {
    let date: Date
    if (typeof dateInput === 'string') {
      const trimmed = dateInput.trim()
      // Se for formato apenas YYYY-MM-DD, adiciona T12:00:00 para evitar desvio de fuso
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        date = new Date(`${trimmed}T12:00:00`)
      } else {
        date = new Date(trimmed)
      }
    } else {
      date = dateInput
    }
    if (isNaN(date.getTime())) return '-'

    const userOptions = options ? cleanDefinedOptions(options) : {}
    const hasAnyUserOption = Object.keys(userOptions).length > 0

    const finalOptions: Intl.DateTimeFormatOptions = hasAnyUserOption
      ? {
          timeZone: TIMEZONE_OFICIAL,
          ...userOptions,
        }
      : {
          timeZone: TIMEZONE_OFICIAL,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }

    return new Intl.DateTimeFormat('pt-BR', cleanDefinedOptions(finalOptions)).format(date)
  } catch (error) {
    console.error('Erro ao formatar data para America/Bahia:', error)
    return '-'
  }
}

/**
 * Formata apenas a data (dd/mm/aaaa) no fuso America/Bahia sem horas.
 */
export function formatDateBahia(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-'
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim()
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed)
    if (match && (!trimmed.includes(':') || trimmed.includes('T00:00:00'))) {
      const [, y, m, d] = match
      return `${d}/${m}/${y}`
    }
  }
  return formatToBahia(dateInput, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * Formata apenas o horário (hh:mm:ss) no fuso America/Bahia.
 */
export function formatTimeBahia(dateInput: string | Date | null | undefined): string {
  return formatToBahia(dateInput, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

/**
 * Retorna a data atual no fuso America/Bahia no formato ISO YYYY-MM-DD.
 * @param offsetDays Quantidade de dias a adicionar/subtrair em relação à data atual (ex: 1 para amanhã).
 */
export function getHojeBahiaIso(offsetDays = 0): string {
  const date = new Date()
  if (offsetDays !== 0) {
    date.setDate(date.getDate() + offsetDays)
  }
  return date.toLocaleDateString('en-CA', { timeZone: TIMEZONE_OFICIAL })
}
