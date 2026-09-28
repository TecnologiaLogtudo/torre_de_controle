import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { torreService } from '@/services/torre/torreService'
import { empresasService } from '@/services/empresas/empresasService'
import { Empresa } from '@/types/empresas'
import { storage } from '@/utils/storage'
import { StatusMotoristasPage } from '@/modules/motoristas/pages/StatusMotoristasPage'

describe('Suíte de Testes S2 — Página de Status de Motoristas', () => {
  beforeEach(() => {
    storage.setToken('mock_valid_token')
    vi.restoreAllMocks()
  })

  it('deve carregar e renderizar a visão consolidada de status por motorista', async () => {
    vi.spyOn(torreService, 'obterStatusMotoristas').mockResolvedValueOnce({
      data: '2026-09-17',
      total: 3,
      disponiveis: 1,
      programados: 1,
      em_rota: 1,
      indisponiveis: 0,
      sem_alocacao: 0,
      motoristas: [
        {
          motorista_id: 'mot-1',
          motorista_nome: 'Carlos Dedicado',
          empresa_id: 'emp-1',
          empresa_nome: 'Logística Parceira SP',
          veiculo_id: 'vec-1',
          veiculo_placa: 'ABC1D23',
          categoria: 'DEDICADO',
          status_operacional: 'EM_ROTA',
          motivo_indisponibilidade: null,
          agendamento_id: null,
        },
        {
          motorista_id: 'mot-2',
          motorista_nome: 'Marcos SPOT',
          empresa_id: null,
          empresa_nome: null,
          veiculo_id: null,
          veiculo_placa: null,
          categoria: null,
          status_operacional: 'SEM_ALOCACAO',
          motivo_indisponibilidade: null,
          agendamento_id: null,
        },
      ],
    })
    vi.spyOn(empresasService, 'listar').mockResolvedValueOnce([
      { id: 'emp-1', nome: 'Logística Parceira SP', identificacao: '123' } as Empresa,
    ])

    render(
      <AuthProvider>
        <MemoryRouter>
          <StatusMotoristasPage />
        </MemoryRouter>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Status de Motoristas')).toBeInTheDocument()
    })

    expect(screen.getByText('Carlos Dedicado')).toBeInTheDocument()
    expect(screen.getByText('Marcos SPOT')).toBeInTheDocument()
    expect(screen.getByText('[ABC1D23]')).toBeInTheDocument()
    expect(screen.getAllByText('Sem Alocação').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Logística Parceira SP').length).toBeGreaterThan(0)

    // Indicadores consolidados
    expect(screen.getAllByText('Disponíveis').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Em Rota').length).toBeGreaterThan(0)
  })

  it('deve exibir perfil SECO em vermelho e perfil REFRIGERADO em azul', async () => {
    vi.spyOn(torreService, 'obterStatusMotoristas').mockResolvedValueOnce({
      data: '2026-09-17',
      total: 2,
      disponiveis: 1,
      programados: 1,
      em_rota: 0,
      indisponiveis: 0,
      sem_alocacao: 0,
      motoristas: [
        {
          motorista_id: 'mot-seco',
          motorista_nome: 'Motorista Carga Seca',
          empresa_id: 'emp-1',
          empresa_nome: 'Empresa Teste',
          veiculo_id: 'vec-1',
          veiculo_placa: 'SEC1A11',
          veiculo_tipo: 'HR',
          veiculo_especialidade: 'SECO',
          categoria: 'DEDICADO',
          status_operacional: 'DISPONIVEL',
          motivo_indisponibilidade: null,
          agendamento_id: null,
        },
        {
          motorista_id: 'mot-ref',
          motorista_nome: 'Motorista Carga Fria',
          empresa_id: 'emp-1',
          empresa_nome: 'Empresa Teste',
          veiculo_id: 'vec-2',
          veiculo_placa: 'REF2B22',
          veiculo_tipo: 'VUC',
          veiculo_especialidade: 'REFRIGERADO',
          categoria: 'SPOT',
          status_operacional: 'PROGRAMADO',
          motivo_indisponibilidade: null,
          agendamento_id: null,
        },
      ],
    })
    vi.spyOn(empresasService, 'listar').mockResolvedValueOnce([])

    render(
      <AuthProvider>
        <MemoryRouter>
          <StatusMotoristasPage />
        </MemoryRouter>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Motorista Carga Seca')).toBeInTheDocument()
    })

    const badgeSeco = screen.getByText('Seco')
    expect(badgeSeco).toBeInTheDocument()
    expect(badgeSeco.className).toContain('text-red-500')

    const badgeRef = screen.getByText('Refrigerado')
    expect(badgeRef).toBeInTheDocument()
    expect(badgeRef.className).toContain('text-blue-500')
  })

  it('deve lidar com estado de erro da API na página de status', async () => {
    vi.spyOn(torreService, 'obterStatusMotoristas').mockRejectedValueOnce(
      new Error('Erro de conexão com o banco PostgreSQL.')
    )
    vi.spyOn(empresasService, 'listar').mockResolvedValueOnce([])

    render(
      <AuthProvider>
        <MemoryRouter>
          <StatusMotoristasPage />
        </MemoryRouter>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Erro de conexão com o banco PostgreSQL.')).toBeInTheDocument()
    })
  })
})
