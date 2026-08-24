/**
 * Utilitário oficial de timezone para a Torre de Controle Logtudo.
 * 
 * Regra:
 * Timezone oficial do sistema: America/Bahia (UTC-3 sem horário de verão).
 * Os timestamps recebidos do backend (UTC) devem ser exibidos formatados no fuso de America/Bahia.
 */

export const TIMEZONE_OFICIAL = 'America/Bahia'

/**
 * Formata um timestamp (string ISO UTC ou objeto Date) no fuso horário America/Bahia.
 */
export function formatToBahia(
  dateInput: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return '-'

  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(date.getTime())) return '-'

    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone: TIMEZONE_OFICIAL,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      ...options,
    }

    return new Intl.DateTimeFormat('pt-BR', defaultOptions).format(date)
  } catch (error) {
    console.error('Erro ao formatar data para America/Bahia:', error)
    return '-'
  }
}

/**
 * Formata apenas a data (dd/mm/aaaa) no fuso America/Bahia.
 */
export function formatDateBahia(dateInput: string | Date | null | undefined): string {
  return formatToBahia(dateInput, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: undefined,
    minute: undefined,
    second: undefined,
  })
}

/**
 * Formata apenas o horário (hh:mm:ss) no fuso America/Bahia.
 */
export function formatTimeBahia(dateInput: string | Date | null | undefined): string {
  return formatToBahia(dateInput, {
    year: undefined,
    month: undefined,
    day: undefined,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}
