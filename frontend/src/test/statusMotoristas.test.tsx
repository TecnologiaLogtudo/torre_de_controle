import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { torreService } from '@/services/torre/torreService'
import { empresasService } from '@/services/empresas/empresasService'
import { motivosService } from '@/services/motivos/motivosService'
import { Empresa } from '@/types/empresas'
import { storage } from '@/utils/storage'
import { StatusMotoristasPage } from '@/modules/motoristas/pages/StatusMotoristasPage'

describe('Suíte de Testes S2 — Página de Status de Motoristas', () => {
  beforeEach(() => {
    storage.setToken('mock_valid_token')
    vi.restoreAllMocks()
    vi.spyOn(motivosService, 'listarMotivos').mockResolvedValue([])
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

  it('deve abrir drawer de alteração de status e submeter novo status operacional', async () => {
    vi.spyOn(torreService, 'obterStatusMotoristas').mockResolvedValue({
      data: '2026-09-17',
      total: 1,
      disponiveis: 0,
      programados: 0,
      em_rota: 0,
      indisponiveis: 0,
      sem_alocacao: 1,
      motoristas: [
        {
          motorista_id: 'mot-10',
          motorista_nome: 'Motorista Alterar Status',
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
    vi.spyOn(empresasService, 'listar').mockResolvedValue([])
    const alterarSpy = vi.spyOn(torreService, 'alterarStatusMotorista').mockResolvedValue({} as any)

    render(
      <AuthProvider>
        <MemoryRouter>
          <StatusMotoristasPage />
        </MemoryRouter>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Motorista Alterar Status')).toBeInTheDocument()
    })

    const btnAlterar = screen.getByRole('button', { name: /Alterar Status/i })
    fireEvent.click(btnAlterar)

    await waitFor(() => {
      expect(screen.getByText('Alterar Status Operacional')).toBeInTheDocument()
    })

    // Clica na opção Disponível
    const btnDisponivel = screen.getByRole('button', { name: /^Disponível/i })
    fireEvent.click(btnDisponivel)

    // Submete a alteração
    const btnConfirmar = screen.getByRole('button', { name: /Confirmar Alteração/i })
    fireEvent.click(btnConfirmar)

    await waitFor(() => {
      expect(alterarSpy).toHaveBeenCalledWith(
        'mot-10',
        expect.objectContaining({
          novo_status: 'DISPONIVEL',
        })
      )
    })
  })

  it('deve desabilitar opções Programado e Em Rota para motorista da categoria SPOT', async () => {
    vi.spyOn(torreService, 'obterStatusMotoristas').mockResolvedValue({
      data: '2026-09-17',
      total: 1,
      disponiveis: 0,
      programados: 0,
      em_rota: 0,
      indisponiveis: 0,
      sem_alocacao: 1,
      motoristas: [
        {
          motorista_id: 'mot-spot-1',
          motorista_nome: 'Motorista Exclusivo Spot',
          empresa_id: null,
          empresa_nome: null,
          veiculo_id: null,
          veiculo_placa: null,
          categoria: 'SPOT',
          status_operacional: 'SEM_ALOCACAO',
          motivo_indisponibilidade: null,
          agendamento_id: null,
        },
      ],
    })
    vi.spyOn(empresasService, 'listar').mockResolvedValue([])

    render(
      <AuthProvider>
        <MemoryRouter>
          <StatusMotoristasPage />
        </MemoryRouter>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Motorista Exclusivo Spot')).toBeInTheDocument()
    })

    const btnAlterar = screen.getByRole('button', { name: /Alterar Status/i })
    fireEvent.click(btnAlterar)

    await waitFor(() => {
      expect(screen.getByText('Alterar Status Operacional')).toBeInTheDocument()
    })

    // Deve exibir o aviso contextual para SPOT
    expect(screen.getByText(/Motorista Spot \(Sem Vínculo com Empresa\)/i)).toBeInTheDocument()

    // Botões Programado e Em Rota no Drawer devem estar desabilitados
    const btnProgramado = screen.getAllByText('Programado').find(el => el.tagName === 'SPAN')?.closest('button')!
    const btnEmRota = screen.getAllByText('Em Rota').find(el => el.tagName === 'SPAN')?.closest('button')!
    expect(btnProgramado).toBeDisabled()
    expect(btnEmRota).toBeDisabled()

    // Opções Disponível e Indisponível devem estar habilitadas
    const btnDisponivel = screen.getByRole('button', { name: /^Disponível/i })
    expect(btnDisponivel).not.toBeDisabled()
  })

  it('deve selecionar motoristas e submeter alteração de status em massa', async () => {
    vi.spyOn(torreService, 'obterStatusMotoristas').mockResolvedValue({
      data: '2026-09-17',
      total: 2,
      disponiveis: 0,
      programados: 0,
      em_rota: 0,
      indisponiveis: 0,
      sem_alocacao: 2,
      motoristas: [
        {
          motorista_id: 'mot-1',
          motorista_nome: 'Motorista Alpha',
          empresa_id: null,
          empresa_nome: null,
          veiculo_id: null,
          veiculo_placa: null,
          categoria: 'SPOT',
          status_operacional: 'SEM_ALOCACAO',
          motivo_indisponibilidade: null,
          agendamento_id: null,
        },
        {
          motorista_id: 'mot-2',
          motorista_nome: 'Motorista Beta',
          empresa_id: null,
          empresa_nome: null,
          veiculo_id: null,
          veiculo_placa: null,
          categoria: 'SPOT',
          status_operacional: 'SEM_ALOCACAO',
          motivo_indisponibilidade: null,
          agendamento_id: null,
        },
      ],
    })
    vi.spyOn(empresasService, 'listar').mockResolvedValue([])
    const spyLote = vi.spyOn(torreService, 'atualizarStatusLote').mockResolvedValue({
      sucesso: true,
      atualizados: 2,
      novo_status: 'DISPONIVEL',
      mensagem: 'Atualizado em massa',
    })

    render(
      <AuthProvider>
        <MemoryRouter>
          <StatusMotoristasPage />
        </MemoryRouter>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Motorista Alpha')).toBeInTheDocument()
    })

    // Seleciona o checkbox global
    const checkboxAll = screen.getByLabelText('Selecionar todos os motoristas')
    fireEvent.click(checkboxAll)

    // Barra de ação em massa deve aparecer
    expect(screen.getByText('2 motorista(s) selecionado(s)')).toBeInTheDocument()

    // Clica no botão de alteração em massa
    const btnMassa = screen.getByRole('button', { name: /Alterar Status em Massa/i })
    fireEvent.click(btnMassa)

    // Drawer de lote deve abrir
    await waitFor(() => {
      expect(screen.getByText(/Alterar Status em Massa \(2 selecionados\)/i)).toBeInTheDocument()
    })

    // Submete o formulário de lote
    const btnAplicar = screen.getByRole('button', { name: /Aplicar a Todos/i })
    fireEvent.click(btnAplicar)

    await waitFor(() => {
      expect(spyLote).toHaveBeenCalledWith(
        expect.objectContaining({
          motorista_ids: ['mot-1', 'mot-2'],
          novo_status: 'DISPONIVEL',
          origem_alteracao: 'status_motoristas_massa',
        })
      )
    })
  })
})
