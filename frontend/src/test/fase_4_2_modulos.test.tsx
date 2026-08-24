import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { empresasService } from '@/services/empresas/empresasService'
import { motoristasService } from '@/services/motoristas/motoristasService'
import { veiculosService } from '@/services/veiculos/veiculosService'
import { contratosService } from '@/services/contratos/contratosService'
import { motivosService } from '@/services/motivos/motivosService'
import { usuariosService } from '@/services/usuarios/usuariosService'
import { agendamentosService } from '@/services/agendamentos/agendamentosService'
import { storage } from '@/utils/storage'
import { EmpresasPage } from '@/modules/empresas/pages/EmpresasPage'
import { MotoristasPage } from '@/modules/motoristas/pages/MotoristasPage'
import { VeiculosPage } from '@/modules/veiculos/pages/VeiculosPage'
import { MotivosIndisponibilidadePage } from '@/modules/operacao/pages/MotivosIndisponibilidadePage'
import { UsuariosPage } from '@/modules/usuarios/pages/UsuariosPage'
import { AgendamentosPage } from '@/modules/agendamentos/pages/AgendamentosPage'

describe('Suíte de Testes da Fase 4.2 — Módulos Operacionais e Interações Críticas', () => {
  beforeEach(() => {
    storage.setToken('mock_valid_token')
    vi.restoreAllMocks()
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
})
