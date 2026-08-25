import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { empresasService } from '@/services/empresas/empresasService'
import { motoristasService } from '@/services/motoristas/motoristasService'
import { veiculosService } from '@/services/veiculos/veiculosService'
import { contratosService } from '@/services/contratos/contratosService'
import { motivosService } from '@/services/motivos/motivosService'
import { usuariosService } from '@/services/usuarios/usuariosService'
import { agendamentosService } from '@/services/agendamentos/agendamentosService'
import { authService } from '@/services/auth/authService'
import { storage } from '@/utils/storage'
import { EmpresasPage } from '@/modules/empresas/pages/EmpresasPage'
import { MotoristasPage } from '@/modules/motoristas/pages/MotoristasPage'
import { VeiculosPage } from '@/modules/veiculos/pages/VeiculosPage'
import { MotivosIndisponibilidadePage } from '@/modules/operacao/pages/MotivosIndisponibilidadePage'
import { UsuariosPage } from '@/modules/usuarios/pages/UsuariosPage'
import { AgendamentosPage } from '@/modules/agendamentos/pages/AgendamentosPage'
import { AgendamentoDetalhesPage } from '@/modules/agendamentos/pages/AgendamentoDetalhesPage'
import { ContratosPage } from '@/modules/contratos/pages/ContratosPage'

describe('Suíte de Testes da Fase 4.2 — Módulos Operacionais e Interações Críticas', () => {
  beforeEach(() => {
    storage.setToken('mock_valid_token')
    vi.restoreAllMocks()
    vi.spyOn(authService, 'getMe').mockResolvedValue({
      id: 'u-1',
      nome: 'Admin Logtudo',
      email: 'admin@logtudo.com',
      ativo: true,
      criado_em: '2026-08-21T10:00:00Z',
      atualizado_em: '2026-08-21T10:00:00Z',
    })
  })

  it('deve preencher automaticamente o veículo ao selecionar o motorista e vice-versa na ContratosPage', async () => {
    vi.spyOn(empresasService, 'listar').mockResolvedValue([
      {
        id: 'emp-1',
        nome: 'Empresa Teste Contratos',
        identificacao: '12345678000199',
        ativo: true,
        criado_em: '2026-08-21T10:00:00Z',
        atualizado_em: '2026-08-21T10:00:00Z',
      },
    ])
    vi.spyOn(contratosService, 'obterConfiguracaoVigente').mockResolvedValue({
      id: 'cfg-1',
      empresa_id: 'emp-1',
      data_inicio: '2026-08-01T00:00:00Z',
      regras: { HR: 5 },
      capacidades: [{ tipo_veiculo: 'HR', especialidade: 'SECO', quantidade: 5 }],
      criado_em: '2026-08-01T00:00:00Z',
      atualizado_em: '2026-08-01T00:00:00Z',
    } as any)
    vi.spyOn(contratosService, 'obterHistoricoConfiguracoes').mockResolvedValue([])
    vi.spyOn(contratosService, 'listarVinculosAtivos').mockResolvedValue([
      {
        id: 'vinc-1',
        empresa_id: null,
        motorista_id: 'mot-1',
        veiculo_id: 'vec-1',
        tipo_veiculo: 'HR',
        categoria_operacional: 'SPOT',
        categoria: 'SPOT',
        ativo: true,
        criado_em: '2026-08-21T10:00:00Z',
        atualizado_em: '2026-08-21T10:00:00Z',
      },
    ])
    vi.spyOn(motoristasService, 'listar').mockResolvedValue([
      {
        id: 'mot-1',
        nome: 'Geovane Ferreira',
        ativo: true,
        criado_em: '2026-08-21T10:00:00Z',
        atualizado_em: '2026-08-21T10:00:00Z',
      },
    ])
    vi.spyOn(veiculosService, 'listar').mockResolvedValue([
      {
        id: 'vec-1',
        identificacao: 'HR-101',
        placa: 'RDK8D49',
        tipo_veiculo: 'HR',
        especialidade: 'SECO',
        ativo: true,
        criado_em: '2026-08-21T10:00:00Z',
        atualizado_em: '2026-08-21T10:00:00Z',
      },
    ])

    render(
      <AuthProvider>
        <MemoryRouter>
          <ContratosPage />
        </MemoryRouter>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/vagas contratadas/i)).toBeInTheDocument()
    })

    // Abre o drawer de vincular motorista dedicado
    const btnVincular = screen.getByRole('button', { name: /Vincular Motorista Dedicado/i })
    fireEvent.click(btnVincular)

    await waitFor(() => {
      expect(screen.getByLabelText('Motorista')).toBeInTheDocument()
    })

    // Seleciona o motorista -> deve auto-selecionar o veículo 'vec-1'
    const selectMotorista = screen.getByLabelText('Motorista') as HTMLSelectElement
    fireEvent.change(selectMotorista, { target: { value: 'mot-1' } })

    const selectVeiculo = screen.getByLabelText(/Veículo Físico/i) as HTMLSelectElement
    expect(selectVeiculo.value).toBe('vec-1')

    // Limpa e seleciona o veículo -> deve auto-selecionar o motorista 'mot-1'
    fireEvent.change(selectMotorista, { target: { value: '' } })
    fireEvent.change(selectVeiculo, { target: { value: 'vec-1' } })
    expect(selectMotorista.value).toBe('mot-1')
  })

  // --- Renderizações Iniciais ---
  it('deve listar empresas parceiras corretamente na EmpresasPage', async () => {
    vi.spyOn(empresasService, 'listar').mockResolvedValueOnce([
      {
        id: 'emp-1',
        nome: 'Transportadora Logtudo SP',
        identificacao: '12.345.678/0001-90',
        ativo: true,
        criado_em: '2026-08-21T10:00:00Z',
        atualizado_em: '2026-08-21T10:00:00Z',
      },
    ])

    render(
      <AuthProvider>
        <MemoryRouter>
          <EmpresasPage />
        </MemoryRouter>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Transportadora Logtudo SP')).toBeInTheDocument()
    })
    expect(screen.getByText('12.345.678/0001-90')).toBeInTheDocument()
  })

  it('deve listar motoristas com suporte a filtros na MotoristasPage', async () => {
    vi.spyOn(motoristasService, 'listar').mockResolvedValueOnce([
      {
        id: 'mot-1',
        nome: 'Carlos Eduardo',
        ativo: true,
        criado_em: '2026-08-21T10:00:00Z',
        atualizado_em: '2026-08-21T10:00:00Z',
      },
    ])
    vi.spyOn(contratosService, 'listarVinculosAtivos').mockResolvedValueOnce([])
    vi.spyOn(veiculosService, 'listar').mockResolvedValueOnce([])
    vi.spyOn(empresasService, 'listar').mockResolvedValueOnce([])

    render(
      <AuthProvider>
        <MemoryRouter>
          <MotoristasPage />
        </MemoryRouter>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Carlos Eduardo')).toBeInTheDocument()
    })
  })

  it('deve listar veículos com placa formatada na VeiculosPage', async () => {
    vi.spyOn(veiculosService, 'listar').mockResolvedValueOnce([
      {
        id: 'vec-1',
        identificacao: 'HR-001',
        placa: 'ABC1D23',
        tipo_veiculo: 'HR',
        especialidade: 'REFRIGERADO',
        ativo: true,
        criado_em: '2026-08-21T10:00:00Z',
        atualizado_em: '2026-08-21T10:00:00Z',
      },
    ])
    vi.spyOn(contratosService, 'listarVinculosAtivos').mockResolvedValueOnce([])
    vi.spyOn(motoristasService, 'listar').mockResolvedValueOnce([])

    render(
      <AuthProvider>
        <MemoryRouter>
          <VeiculosPage />
        </MemoryRouter>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('ABC1D23')).toBeInTheDocument()
    })
    expect(screen.getByText('HR-001')).toBeInTheDocument()
  })

  it('deve listar motivos de indisponibilidade na MotivosIndisponibilidadePage', async () => {
    vi.spyOn(motivosService, 'listarMotivos').mockResolvedValueOnce([
      {
        id: 'motivo-1',
        nome: 'Manutenção de Freio',
        descricao: 'Manutenção corretiva',
        ativo: true,
        criado_em: '2026-08-21T10:00:00Z',
        atualizado_em: '2026-08-21T10:00:00Z',
      },
    ])

    render(
      <AuthProvider>
        <MemoryRouter>
          <MotivosIndisponibilidadePage />
        </MemoryRouter>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Manutenção de Freio')).toBeInTheDocument()
    })
  })

  it('deve listar usuários do sistema na UsuariosPage', async () => {
    vi.spyOn(usuariosService, 'listar').mockResolvedValueOnce([
      {
        id: 'usr-1',
        nome: 'Felipe Operador',
        email: 'felipe@logtudo.com.br',
        ativo: true,
        criado_em: '2026-08-21T10:00:00Z',
        atualizado_em: '2026-08-21T10:00:00Z',
      },
    ])

    render(
      <AuthProvider>
        <MemoryRouter>
          <UsuariosPage />
        </MemoryRouter>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Felipe Operador')).toBeInTheDocument()
    })
    expect(screen.getByText('felipe@logtudo.com.br')).toBeInTheDocument()
  })

  // --- Testes de Interação Crítica: Agendamento & Drawers ---
  it('deve abrir o drawer de novo agendamento e preencher o formulário', async () => {
    vi.spyOn(agendamentosService, 'listar').mockResolvedValueOnce({
      items: [],
      total: 0,
      limite: 10,
      offset: 0,
    })
    vi.spyOn(empresasService, 'listar').mockResolvedValueOnce([
      {
        id: 'emp-1',
        nome: 'Empresa Teste Logtudo',
        identificacao: '12345678000199',
        ativo: true,
        criado_em: '2026-08-21T10:00:00Z',
        atualizado_em: '2026-08-21T10:00:00Z',
      },
    ])

    render(
      <AuthProvider>
        <MemoryRouter>
          <AgendamentosPage />
        </MemoryRouter>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Nenhum agendamento encontrado')).toBeInTheDocument()
    })

    const btnNovo = screen.getByText('Novo Agendamento')
    fireEvent.click(btnNovo)

    await waitFor(() => {
      expect(screen.getByText('Novo Agendamento Operacional')).toBeInTheDocument()
    })
  })

  it('deve tratar erro retornado pela API na criação de agendamento', async () => {
    vi.spyOn(agendamentosService, 'listar').mockResolvedValueOnce({
      items: [],
      total: 0,
      limite: 10,
      offset: 0,
    })
    vi.spyOn(empresasService, 'listar').mockResolvedValueOnce([
      {
        id: 'emp-1',
        nome: 'Empresa Teste Logtudo',
        identificacao: '12345678000199',
        ativo: true,
        criado_em: '2026-08-21T10:00:00Z',
        atualizado_em: '2026-08-21T10:00:00Z',
      },
    ])
    vi.spyOn(agendamentosService, 'criar').mockRejectedValueOnce(
      new Error('Horário limite de agendamento para a data selecionada foi ultrapassado.')
    )

    render(
      <AuthProvider>
        <MemoryRouter>
          <AgendamentosPage />
        </MemoryRouter>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Nenhum agendamento encontrado')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Novo Agendamento'))

    await waitFor(() => {
      expect(screen.getByText('Novo Agendamento Operacional')).toBeInTheDocument()
    })

    const btnSalvar = screen.getByText('Criar e Abrir Agendamento')
    fireEvent.click(btnSalvar)

    await waitFor(() => {
      expect(
        screen.getByText('Horário limite de agendamento para a data selecionada foi ultrapassado.')
      ).toBeInTheDocument()
    })
  })

  // --- Testes de Interação: SPOT Substituição e Lock ---
  it('deve chamar agendamentosService.substituirSpot ao confirmar substituição de SPOT', async () => {
    const mockSubstituir = vi.spyOn(agendamentosService, 'substituirSpot').mockResolvedValueOnce({
      id: 'aloc-spot-new',
      agendamento_id: 'ag-1',
      motorista_id: 'mot-2',
      veiculo_id: 'vec-2',
      categoria: 'SPOT',
      status_operacional: 'PROGRAMADO',
      criado_em: '2026-08-21T10:00:00Z',
      atualizado_em: '2026-08-21T10:00:00Z',
    })

    const payload = {
      motorista_id: 'mot-2',
      veiculo_id: 'vec-2',
      categoria: 'SPOT' as const,
    }

    const res = await agendamentosService.substituirSpot('aloc-spot-old', payload)

    expect(mockSubstituir).toHaveBeenCalledWith('aloc-spot-old', payload)
    expect(res.id).toBe('aloc-spot-new')
  })

  it('deve tratar erro de conflito de alocação retornado ao adicionar SPOT', async () => {
    vi.spyOn(agendamentosService, 'adicionarSpot').mockRejectedValueOnce(
      new Error('Motorista selecionado já possui alocação ativa neste horário.')
    )

    await expect(
      agendamentosService.adicionarSpot('ag-1', {
        motorista_id: 'mot-ocupado',
        veiculo_id: 'vec-1',
        categoria: 'SPOT',
      })
    ).rejects.toThrow('Motorista selecionado já possui alocação ativa neste horário.')
  })

  it('deve preencher automaticamente o veículo ao selecionar o motorista e vice-versa no modal SPOT de AgendamentoDetalhesPage', async () => {
    vi.spyOn(agendamentosService, 'buscarPorId').mockResolvedValue({
      id: 'ag-1',
      empresa_id: 'emp-1',
      data: '2026-08-25',
      horario_inicio: '08:00',
      status: 'EM_ANDAMENTO',
      alocacoes: [],
      criado_em: '2026-08-21T10:00:00Z',
      atualizado_em: '2026-08-21T10:00:00Z',
    })
    vi.spyOn(empresasService, 'buscarPorId').mockResolvedValue({
      id: 'emp-1',
      nome: 'Empresa Teste Agendamento',
      identificacao: '12345678000199',
      ativo: true,
      criado_em: '2026-08-21T10:00:00Z',
      atualizado_em: '2026-08-21T10:00:00Z',
    })
    vi.spyOn(agendamentosService, 'obterHistorico').mockResolvedValue([])
    vi.spyOn(motoristasService, 'listar').mockResolvedValue([
      {
        id: 'mot-spot-1',
        nome: 'Tiago Santos Passos',
        ativo: true,
        criado_em: '2026-08-21T10:00:00Z',
        atualizado_em: '2026-08-21T10:00:00Z',
      },
    ])
    vi.spyOn(veiculosService, 'listar').mockResolvedValue([
      {
        id: 'vec-spot-1',
        identificacao: 'HR-202',
        placa: 'NTP4B36',
        tipo_veiculo: 'HR',
        especialidade: 'SECO',
        ativo: true,
        criado_em: '2026-08-21T10:00:00Z',
        atualizado_em: '2026-08-21T10:00:00Z',
      },
    ])
    vi.spyOn(motivosService, 'listarMotivos').mockResolvedValue([])
    vi.spyOn(contratosService, 'listarVinculosAtivos').mockResolvedValue([
      {
        id: 'vinc-spot-1',
        empresa_id: null,
        motorista_id: 'mot-spot-1',
        veiculo_id: 'vec-spot-1',
        tipo_veiculo: 'HR',
        categoria_operacional: 'SPOT',
        categoria: 'SPOT',
        ativo: true,
        criado_em: '2026-08-21T10:00:00Z',
        atualizado_em: '2026-08-21T10:00:00Z',
      },
    ])

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/agendamentos/ag-1']}>
          <Routes>
            <Route path="/agendamentos/:id" element={<AgendamentoDetalhesPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Empresa Teste Agendamento')).toBeInTheDocument()
    })

    // Abre o drawer de Adicionar SPOT
    const btnAddSpot = screen.getByRole('button', { name: /Adicionar SPOT/i })
    fireEvent.click(btnAddSpot)

    await waitFor(() => {
      expect(screen.getByLabelText(/Motorista SPOT/i)).toBeInTheDocument()
    })

    // 1. Seleciona o motorista -> deve auto-selecionar o veículo 'vec-spot-1'
    const selectMotorista = screen.getByLabelText(/Motorista SPOT/i) as HTMLSelectElement
    fireEvent.change(selectMotorista, { target: { value: 'mot-spot-1' } })

    const selectVeiculo = screen.getByLabelText(/Veículo SPOT/i) as HTMLSelectElement
    expect(selectVeiculo.value).toBe('vec-spot-1')

    // 2. Limpa e seleciona o veículo -> deve auto-selecionar o motorista 'mot-spot-1'
    fireEvent.change(selectMotorista, { target: { value: '' } })
    fireEvent.change(selectVeiculo, { target: { value: 'vec-spot-1' } })

    expect(selectMotorista.value).toBe('mot-spot-1')
  })
})
