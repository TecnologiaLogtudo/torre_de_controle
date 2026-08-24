import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { torreService } from '@/services/torre/torreService'
import { empresasService } from '@/services/empresas/empresasService'
import { storage } from '@/utils/storage'
import { TorrePage } from '@/modules/torre/pages/TorrePage'

describe('Suíte de Testes da Fase 4.3 — Torre de Controle Operacional', () => {
  beforeEach(() => {
    storage.setToken('mock_valid_token')
    vi.restoreAllMocks()
  })

  it('deve carregar e renderizar os indicadores operacionais da Torre de Controle', async () => {
    vi.spyOn(torreService, 'obterResumoGeral').mockResolvedValueOnce({
      contratados: 10,
      total: 8,
      disponiveis: 3,
      programados: 3,
      em_rota: 2,
      indisponiveis: 0,
      vagas_nao_preenchidas: 2,
    })
    vi.spyOn(torreService, 'obterResumoPorEmpresa').mockResolvedValueOnce([
      {
        empresa_id: 'emp-1',
        empresa_nome: 'Logística Parceira SP',
        regras_capacidade: { HR: 4, Fiorino: 6 },
        contratados: 10,
        total: 8,
        disponiveis: 3,
        programados: 3,
        em_rota: 2,
        indisponiveis: 0,
        vagas_nao_preenchidas: 2,
      },
    ])
    vi.spyOn(torreService, 'obterDetalhamento').mockResolvedValueOnce([
      {
        motorista_id: 'mot-1',
        motorista_nome: 'João da Silva',
        veiculo_id: 'vec-1',
        veiculo_identificacao: 'HR-001',
        placa: 'ABC1D23',
        tipo_veiculo: 'HR',
        especialidade: 'REFRIGERADO',
        categoria: 'DEDICADO',
        status_operacional: 'EM_ROTA',
        empresa_nome: 'Logística Parceira SP',
      },
    ])
    vi.spyOn(torreService, 'listarHistoricoEventos').mockResolvedValueOnce([
      {
        id: 'ev-1',
        empresa_id: 'emp-1',
        motorista_id: 'mot-1',
        veiculo_id: 'vec-1',
        categoria: 'DEDICADO',
        status_anterior: 'PROGRAMADO',
        novo_status: 'EM_ROTA',
        usuario_id: 'usr-1',
        criado_em: '2026-08-21T14:30:00Z',
      },
    ])
    vi.spyOn(empresasService, 'listar').mockResolvedValueOnce([])

    render(
      <AuthProvider>
        <MemoryRouter>
          <TorrePage />
        </MemoryRouter>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Torre de Controle Operacional')).toBeInTheDocument()
    })

    expect(screen.getAllByText('Logística Parceira SP').length).toBeGreaterThan(0)
    expect(screen.getByText('João da Silva')).toBeInTheDocument()
    expect(screen.getByText('[ABC1D23]')).toBeInTheDocument()
  })

  it('deve lidar com estado de erro da API na Torre de Controle', async () => {
    vi.spyOn(torreService, 'obterResumoGeral').mockRejectedValueOnce(
      new Error('Erro de conexão com o banco PostgreSQL.')
    )
    vi.spyOn(torreService, 'obterResumoPorEmpresa').mockResolvedValueOnce([])
    vi.spyOn(torreService, 'obterDetalhamento').mockResolvedValueOnce([])
    vi.spyOn(torreService, 'listarHistoricoEventos').mockResolvedValueOnce([])
    vi.spyOn(empresasService, 'listar').mockResolvedValueOnce([])

    render(
      <AuthProvider>
        <MemoryRouter>
          <TorrePage />
        </MemoryRouter>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Erro de conexão com o banco PostgreSQL.')).toBeInTheDocument()
    })
  })

  it('deve disparar a atualização manual dos dados da Torre ao clicar em Atualizar', async () => {
    const mockResumo = vi.spyOn(torreService, 'obterResumoGeral').mockResolvedValue({
      contratados: 5,
      total: 5,
      disponiveis: 2,
      programados: 2,
      em_rota: 1,
      indisponiveis: 0,
      vagas_nao_preenchidas: 0,
    })
    vi.spyOn(torreService, 'obterResumoPorEmpresa').mockResolvedValue([])
    vi.spyOn(torreService, 'obterDetalhamento').mockResolvedValue([])
    vi.spyOn(torreService, 'listarHistoricoEventos').mockResolvedValue([])
    vi.spyOn(empresasService, 'listar').mockResolvedValue([])

    render(
      <AuthProvider>
        <MemoryRouter>
          <TorrePage />
        </MemoryRouter>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Torre de Controle Operacional')).toBeInTheDocument()
    })

    const btnAtualizar = screen.getByText('Atualizar Dados')
    fireEvent.click(btnAtualizar)

    await waitFor(() => {
      expect(mockResumo).toHaveBeenCalledTimes(2)
    })
  })
})
