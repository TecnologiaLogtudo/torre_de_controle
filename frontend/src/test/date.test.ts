import { describe, it, expect } from 'vitest'
import { formatToBahia, formatDateBahia, formatTimeBahia, getHojeBahiaIso } from '@/utils/date'

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

  it('deve suportar opções de estilo dateStyle e timeStyle sem lançar TypeError', () => {
    const dateUtc = '2026-08-21T15:30:00Z'
    // Não deve lançar erro e deve formatar corretamente
    const formattedTime = formatToBahia(dateUtc, { timeStyle: 'medium' })
    expect(formattedTime).toContain('12:30:00')

    const formattedDate = formatToBahia(dateUtc, { dateStyle: 'short' })
    expect(formattedDate).toContain('21/08/2026')
  })

  it('deve ignorar propriedades com valor undefined no options', () => {
    const dateUtc = '2026-08-21T15:30:00Z'
    const formatted = formatToBahia(dateUtc, {
      dateStyle: undefined,
      timeStyle: 'medium',
      hour: undefined,
    })
    expect(formatted).toContain('12:30:00')
  })

  it('deve retornar data no formato ISO YYYY-MM-DD para o fuso America/Bahia com getHojeBahiaIso', () => {
    const hoje = getHojeBahiaIso()
    expect(hoje).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const amanha = getHojeBahiaIso(1)
    expect(amanha).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    // Amanhã deve ser diferente de hoje
    expect(amanha).not.toBe(hoje)
  })
})
