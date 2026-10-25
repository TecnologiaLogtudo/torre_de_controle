import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { NavigationGuardProvider } from '@/app/providers/NavigationGuardProvider'
import { agendamentosService } from '@/services/agendamentos/agendamentosService'
import { empresasService } from '@/services/empresas/empresasService'
import { motoristasService } from '@/services/motoristas/motoristasService'
import { veiculosService } from '@/services/veiculos/veiculosService'
import { motivosService } from '@/services/motivos/motivosService'
import { contratosService } from '@/services/contratos/contratosService'
import { torreService } from '@/services/torre/torreService'
import { authService } from '@/services/auth/authService'
import { storage } from '@/utils/storage'
import { AgendamentoDetalhesPage } from '@/modules/agendamentos/pages/AgendamentoDetalhesPage'

describe('Suíte de Testes — Melhorias no Agendamento', () => {
  beforeEach(() => {
    storage.setToken('mock_token_agendamento')
    vi.restoreAllMocks()

    vi.spyOn(authService, 'getMe').mockResolvedValue({
      id: 'u-1',
      nome: 'Operador Logtudo',
      email: 'operador@logtudo.com',
      ativo: true,
      criado_em: '2026-08-21T10:00:00Z',
      atualizado_em: '2026-08-21T10:00:00Z',
    })

    vi.spyOn(empresasService, 'buscarPorId').mockResolvedValue({
      id: 'emp-1',
      nome: 'Lactalis Brasil',
      identificacao: '12345678000100',
      ativo: true,
      criado_em: '2026-08-21T10:00:00Z',
      atualizado_em: '2026-08-21T10:00:00Z',
    })

    vi.spyOn(agendamentosService, 'obterHistorico').mockResolvedValue([])
    vi.spyOn(motivosService, 'listarMotivos').mockResolvedValue([])
    vi.spyOn(contratosService, 'listarVinculosAtivos').mockResolvedValue([])
    vi.spyOn(torreService, 'obterDetalhamento').mockResolvedValue([])
    vi.spyOn(torreService, 'obterStatusMotoristas').mockResolvedValue({ motoristas: [] } as any)
  })

  it('deve listar motoristas e veículos SPOT em ordem alfabética A-Z no modal SPOT', async () => {
    vi.spyOn(agendamentosService, 'buscarPorId').mockResolvedValue({
      id: 'ag-1',
      empresa_id: 'emp-1',
      data: '2026-10-25',
      horario_inicio: '08:00',
      status: 'PROGRAMADO',
      versao: 1,
      criado_por_id: 'u-1',
      alocacoes: [],
      criado_em: '2026-10-25T08:00:00Z',
      atualizado_em: '2026-10-25T08:00:00Z',
    })

    // Motoristas intencionalmente desordenados
    vi.spyOn(motoristasService, 'listar').mockResolvedValue([
      { id: 'm-3', nome: 'Zeca Pagodinho', ativo: true } as any,
      { id: 'm-1', nome: 'Ana Maria', ativo: true } as any,
      { id: 'm-2', nome: 'Carlos Silva', ativo: true } as any,
    ])

    // Veículos intencionalmente desordenados
    vi.spyOn(veiculosService, 'listar').mockResolvedValue([
      { id: 'v-3', tipo_veiculo: 'VUC', placa: 'AAA-1111', especialidade: 'SECO', ativo: true } as any,
      { id: 'v-1', tipo_veiculo: 'Fiorino', placa: 'ZZZ-9999', especialidade: 'SECO', ativo: true } as any,
      { id: 'v-2', tipo_veiculo: 'HR', placa: 'BBB-2222', especialidade: 'REFRIGERADO', ativo: true } as any,
    ])

    render(
      <AuthProvider>
        <NavigationGuardProvider>
          <MemoryRouter initialEntries={['/app/agendamentos/ag-1']}>
            <Routes>
              <Route path="/app/agendamentos/:id" element={<AgendamentoDetalhesPage />} />
            </Routes>
          </MemoryRouter>
        </NavigationGuardProvider>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Adicionar SPOT')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Adicionar SPOT'))

    // Valida se as opções de motoristas estão em ordem alfabética: Ana Maria -> Carlos Silva -> Zeca Pagodinho
    const selectMotorista = screen.getByLabelText(/Motorista SPOT/i) as HTMLSelectElement
    const optMotoristas = Array.from(selectMotorista.options)
      .filter(o => o.value)
      .map(o => o.text)

    expect(optMotoristas).toEqual(['Ana Maria', 'Carlos Silva', 'Zeca Pagodinho'])

    // Valida se as opções de veículos estão em ordem alfabética: Fiorino -> HR -> VUC
    const selectVeiculo = screen.getByLabelText(/Veículo SPOT/i) as HTMLSelectElement
    const optVeiculos = Array.from(selectVeiculo.options)
      .filter(o => o.value)
      .map(o => o.text)

    expect(optVeiculos[0]).toContain('Fiorino')
    expect(optVeiculos[1]).toContain('HR')
    expect(optVeiculos[2]).toContain('VUC')
  })

  it('deve selecionar todos os dedicados, exibir a barra flutuante e selecionar todos os SPOTs', async () => {
    vi.spyOn(agendamentosService, 'buscarPorId').mockResolvedValue({
      id: 'ag-2',
      empresa_id: 'emp-1',
      data: '2026-10-25',
      horario_inicio: '08:00',
      status: 'PROGRAMADO',
      versao: 1,
      criado_por_id: 'u-1',
      alocacoes: [
        {
          id: 'aloc-ded-1',
          agendamento_id: 'ag-2',
          motorista_id: 'm-1',
          veiculo_id: 'v-1',
          categoria: 'DEDICADO',
          status_operacional: 'PROGRAMADO',
          criado_em: '2026-10-25T08:00:00Z',
          atualizado_em: '2026-10-25T08:00:00Z',
        },
        {
          id: 'aloc-ded-2',
          agendamento_id: 'ag-2',
          motorista_id: 'm-2',
          veiculo_id: 'v-2',
          categoria: 'DEDICADO',
          status_operacional: 'PROGRAMADO',
          criado_em: '2026-10-25T08:00:00Z',
          atualizado_em: '2026-10-25T08:00:00Z',
        },
        {
          id: 'aloc-spot-1',
          agendamento_id: 'ag-2',
          motorista_id: 'm-3',
          veiculo_id: 'v-3',
          categoria: 'SPOT',
          status_operacional: 'PROGRAMADO',
          criado_em: '2026-10-25T08:00:00Z',
          atualizado_em: '2026-10-25T08:00:00Z',
        },
      ],
      criado_em: '2026-10-25T08:00:00Z',
      atualizado_em: '2026-10-25T08:00:00Z',
    })

    vi.spyOn(motoristasService, 'listar').mockResolvedValue([
      { id: 'm-1', nome: 'Motorista 1', ativo: true } as any,
      { id: 'm-2', nome: 'Motorista 2', ativo: true } as any,
      { id: 'm-3', nome: 'Motorista 3', ativo: true } as any,
    ])

    vi.spyOn(veiculosService, 'listar').mockResolvedValue([
      { id: 'v-1', tipo_veiculo: 'Fiorino', placa: 'ABC-1234', ativo: true } as any,
      { id: 'v-2', tipo_veiculo: 'VUC', placa: 'DEF-5678', ativo: true } as any,
      { id: 'v-3', tipo_veiculo: 'HR', placa: 'GHI-9012', ativo: true } as any,
    ])

    render(
      <AuthProvider>
        <NavigationGuardProvider>
          <MemoryRouter initialEntries={['/app/agendamentos/ag-2']}>
            <Routes>
              <Route path="/app/agendamentos/:id" element={<AgendamentoDetalhesPage />} />
            </Routes>
          </MemoryRouter>
        </NavigationGuardProvider>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Selecionar Todos os Dedicados')).toBeInTheDocument()
    })

    // Clica para selecionar todos os dedicados
    fireEvent.click(screen.getByText('Selecionar Todos os Dedicados'))

    // Barra flutuante surge exibindo 2 de 3 selecionadas
    await waitFor(() => {
      expect(screen.getByText('2 de 3 vaga(s) selecionada(s)')).toBeInTheDocument()
    })

    // Botão agora mudou para "Desmarcar Dedicados"
    expect(screen.getByText('Desmarcar Dedicados')).toBeInTheDocument()

    // Clica para selecionar todos os SPOT
    fireEvent.click(screen.getByText('Selecionar Todos os SPOT'))

    // Agora 3 de 3 selecionadas
    await waitFor(() => {
      expect(screen.getByText('3 de 3 vaga(s) selecionada(s)')).toBeInTheDocument()
    })

    // Desmarcar todas pela barra flutuante
    fireEvent.click(screen.getByText('Desmarcar Todas'))
    await waitFor(() => {
      expect(screen.queryByText('3 de 3 vaga(s) selecionada(s)')).not.toBeInTheDocument()
    })
  })

  it('deve bloquear a saída com o modal de salvar/desfazer se houver alterações de SPOT não salvas', async () => {
    vi.spyOn(agendamentosService, 'buscarPorId').mockResolvedValue({
      id: 'ag-3',
      empresa_id: 'emp-1',
      data: '2026-10-25',
      horario_inicio: '08:00',
      status: 'PROGRAMADO',
      versao: 1,
      criado_por_id: 'u-1',
      alocacoes: [
        {
          id: 'aloc-spot-rem',
          agendamento_id: 'ag-3',
          motorista_id: 'm-1',
          veiculo_id: 'v-1',
          categoria: 'SPOT',
          status_operacional: 'PROGRAMADO',
          criado_em: '2026-10-25T08:00:00Z',
          atualizado_em: '2026-10-25T08:00:00Z',
        },
      ],
      criado_em: '2026-10-25T08:00:00Z',
      atualizado_em: '2026-10-25T08:00:00Z',
    })

    vi.spyOn(motoristasService, 'listar').mockResolvedValue([
      { id: 'm-1', nome: 'Motorista Spot', ativo: true } as any,
    ])
    vi.spyOn(veiculosService, 'listar').mockResolvedValue([
      { id: 'v-1', tipo_veiculo: 'Fiorino', placa: 'ABC-1234', ativo: true } as any,
    ])
    vi.spyOn(agendamentosService, 'removerSpot').mockResolvedValue(undefined)
    vi.spyOn(agendamentosService, 'restaurarAlocacoes').mockResolvedValue({
      id: 'ag-3',
      empresa_id: 'emp-1',
      data: '2026-10-25',
      horario_inicio: '08:00',
      status: 'PROGRAMADO',
      versao: 1,
      criado_por_id: 'u-1',
      alocacoes: [],
      criado_em: '2026-10-25T08:00:00Z',
      atualizado_em: '2026-10-25T08:00:00Z',
    })

    render(
      <AuthProvider>
        <NavigationGuardProvider>
          <MemoryRouter initialEntries={['/app/agendamentos/ag-3']}>
            <Routes>
              <Route path="/app/agendamentos/:id" element={<AgendamentoDetalhesPage />} />
              <Route path="/app/agendamentos" element={<div>Página Lista Agendamentos</div>} />
            </Routes>
          </MemoryRouter>
        </NavigationGuardProvider>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Remover')).toBeInTheDocument()
    })

    // Remove o SPOT
    fireEvent.click(screen.getByText('Remover'))
    await waitFor(() => {
      expect(screen.getByText('Sim, Remover')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Sim, Remover'))

    await waitFor(() => {
      expect(screen.getByText(/Existem modificações recentes na composição de recursos/i)).toBeInTheDocument()
    })

    // Tenta clicar no botão "Voltar"
    fireEvent.click(screen.getByText('Voltar'))

    // Deve abrir o Modal Bloqueante de Saída com as 3 opções
    await waitFor(() => {
      expect(screen.getByText('Alterações não salvas na programação')).toBeInTheDocument()
      expect(screen.getByText('Salvar Agendamento e Prosseguir')).toBeInTheDocument()
      expect(screen.getByText('Desfazer Alterações e Sair')).toBeInTheDocument()
      expect(screen.getByText('Permanecer na Tela')).toBeInTheDocument()
    })

    // Clica em "Permanecer na Tela" -> modal fecha e continua na tela
    fireEvent.click(screen.getByText('Permanecer na Tela'))
    await waitFor(() => {
      expect(screen.queryByText('Alterações não salvas na programação')).not.toBeInTheDocument()
    })

    // Clica novamente em "Voltar" e agora escolhe "Desfazer Alterações e Sair"
    fireEvent.click(screen.getByText('Voltar'))
    await waitFor(() => {
      expect(screen.getByText('Desfazer Alterações e Sair')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Desfazer Alterações e Sair'))

    await waitFor(() => {
      expect(agendamentosService.restaurarAlocacoes).toHaveBeenCalledWith(
        'ag-3',
        expect.any(Array)
      )
    })
  })
})
