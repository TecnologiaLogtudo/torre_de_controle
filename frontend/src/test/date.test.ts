import { describe, it, expect } from 'vitest'
import { formatToBahia, formatDateBahia, formatTimeBahia } from '@/utils/date'

describe('Utilitário de Timezone (America/Bahia)', () => {
  it('deve formatar uma data ISO UTC para America/Bahia (UTC-3)', () => {
    // 2026-08-21 15:30:00 UTC -> 12:30:00 em America/Bahia (UTC-3)
    const dateUtc = '2026-08-21T15:30:00Z'
    const formatted = formatToBahia(dateUtc)
    expect(formatted).toContain('21/08/2026')
    expect(formatted).toContain('12:30:00')
  })

  it('deve formatar apenas a data para o fuso de Bahia', () => {
    const dateUtc = '2026-08-21T02:00:00Z' // 21/08 em UTC -> 20/08 23:00 em Bahia (UTC-3)
    const formattedDate = formatDateBahia(dateUtc)
    expect(formattedDate).toBe('20/08/2026')
  })

  it('deve formatar apenas a hora no fuso de Bahia', () => {
    const dateUtc = '2026-08-21T18:45:10Z'
    const formattedTime = formatTimeBahia(dateUtc)
    expect(formattedTime).toBe('15:45:10')
  })

  it('deve tratar entradas nulas ou inválidas sem quebrar', () => {
    expect(formatToBahia(null)).toBe('-')
    expect(formatToBahia(undefined)).toBe('-')
    expect(formatToBahia('data_invalida')).toBe('-')
  })
})
