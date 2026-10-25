import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { motoristasService } from '@/services/motoristas/motoristasService'
import { veiculosService } from '@/services/veiculos/veiculosService'
import { contratosService } from '@/services/contratos/contratosService'
import { empresasService } from '@/services/empresas/empresasService'
import { authService } from '@/services/auth/authService'
import { storage } from '@/utils/storage'
import { MotoristasPage } from '@/modules/motoristas/pages/MotoristasPage'
import { VeiculosPage } from '@/modules/veiculos/pages/VeiculosPage'

describe('Suíte de Testes — Cadastro Casado de Motoristas e Veículos', () => {
  beforeEach(() => {
    storage.setToken('mock_token_test')
    vi.restoreAllMocks()

    vi.spyOn(authService, 'getMe').mockResolvedValue({
      id: 'u-1',
      nome: 'Operador Logtudo',
      email: 'operador@logtudo.com',
      ativo: true,
      criado_em: '2026-08-21T10:00:00Z',
      atualizado_em: '2026-08-21T10:00:00Z',
    })

    vi.spyOn(empresasService, 'listar').mockResolvedValue([
      {
        id: 'emp-1',
        nome: 'Lactalis Brasil',
        identificacao: '12345678000100',
        ativo: true,
        criado_em: '2026-08-21T10:00:00Z',
        atualizado_em: '2026-08-21T10:00:00Z',
      },
    ])
  })

  describe('MotoristasPage — Cadastro Casado', () => {
    it('deve cadastrar novo motorista com novo veículo casado no mesmo container', async () => {
      vi.spyOn(motoristasService, 'listar').mockResolvedValue([])
      vi.spyOn(veiculosService, 'listar').mockResolvedValue([])
      vi.spyOn(contratosService, 'listarVinculosAtivos').mockResolvedValue([])

      const spyCriarMotorista = vi.spyOn(motoristasService, 'criar').mockResolvedValue({
        id: 'm-new-1',
        nome: 'João da Silva',
        ativo: true,
        criado_em: '2026-10-25T10:00:00Z',
        atualizado_em: '2026-10-25T10:00:00Z',
      })

      const spyCriarVeiculo = vi.spyOn(veiculosService, 'criar').mockResolvedValue({
        id: 'v-new-1',
        placa: 'BRA2E19',
        tipo_veiculo: 'HR',
        especialidade: 'SECO',
        ativo: true,
        criado_em: '2026-10-25T10:00:00Z',
        atualizado_em: '2026-10-25T10:00:00Z',
      })

      const spyCriarVinculo = vi.spyOn(contratosService, 'criarVinculoDedicado').mockResolvedValue({
        id: 'vinc-1',
        empresa_id: undefined,
        motorista_id: 'm-new-1',
        veiculo_id: 'v-new-1',
        tipo_veiculo: 'HR',
        categoria_operacional: 'SPOT',
        categoria: 'SPOT',
        ativo: true,
        criado_em: '2026-10-25T10:00:00Z',
        atualizado_em: '2026-10-25T10:00:00Z',
      })

      render(
        <AuthProvider>
          <MemoryRouter>
            <MotoristasPage />
          </MemoryRouter>
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Novo Motorista')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Novo Motorista'))

      // Preenche nome do motorista
      const inputNome = screen.getByLabelText(/Nome Completo do Motorista/i)
      fireEvent.change(inputNome, { target: { value: 'João da Silva' } })

      // Seleciona aba "+ Novo Veículo Casado"
      fireEvent.click(screen.getByText('+ Novo Veículo Casado'))

      // Preenche placa do novo veículo
      const inputPlaca = screen.getByLabelText(/Placa do Veículo/i)
      fireEvent.change(inputPlaca, { target: { value: 'BRA2E19' } })

      // Submete formulário clicando no botão submit do drawer
      const submitBtn = screen.getAllByRole('button', { name: /Cadastrar Motorista/i }).find(b => b.getAttribute('type') === 'submit')!
      fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(spyCriarMotorista).toHaveBeenCalledWith({ nome: 'João da Silva' })
        expect(spyCriarVeiculo).toHaveBeenCalledWith({
          placa: 'BRA2E19',
          tipo_veiculo: 'HR',
          especialidade: 'SECO',
        })
        expect(spyCriarVinculo).toHaveBeenCalledWith(
          expect.objectContaining({
            motorista_id: 'm-new-1',
            veiculo_id: 'v-new-1',
            categoria: 'SPOT',
          })
        )
      })
    })

    it('deve vincular veículo existente no cadastro de novo motorista', async () => {
      vi.spyOn(motoristasService, 'listar').mockResolvedValue([])
      vi.spyOn(veiculosService, 'listar').mockResolvedValue([
        {
          id: 'v-exist-1',
          placa: 'ABC1D23',
          tipo_veiculo: 'Fiorino',
          especialidade: 'REFRIGERADO',
          ativo: true,
          criado_em: '2026-10-25T10:00:00Z',
          atualizado_em: '2026-10-25T10:00:00Z',
        },
      ])
      vi.spyOn(contratosService, 'listarVinculosAtivos').mockResolvedValue([])

      const spyCriarMotorista = vi.spyOn(motoristasService, 'criar').mockResolvedValue({
        id: 'm-new-2',
        nome: 'Marcos Souza',
        ativo: true,
        criado_em: '2026-10-25T10:00:00Z',
        atualizado_em: '2026-10-25T10:00:00Z',
      })

      const spyCriarVinculo = vi.spyOn(contratosService, 'criarVinculoDedicado').mockResolvedValue({
        id: 'vinc-2',
        empresa_id: undefined,
        motorista_id: 'm-new-2',
        veiculo_id: 'v-exist-1',
        tipo_veiculo: 'Fiorino',
        categoria_operacional: 'SPOT',
        categoria: 'SPOT',
        ativo: true,
        criado_em: '2026-10-25T10:00:00Z',
        atualizado_em: '2026-10-25T10:00:00Z',
      })

      render(
        <AuthProvider>
          <MemoryRouter>
            <MotoristasPage />
          </MemoryRouter>
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Novo Motorista')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Novo Motorista'))

      fireEvent.change(screen.getByLabelText(/Nome Completo do Motorista/i), {
        target: { value: 'Marcos Souza' },
      })

      // Seleciona aba "Vincular Existente"
      fireEvent.click(screen.getByText('Vincular Existente'))

      // Seleciona o veículo existente
      const selectVeic = screen.getByLabelText(/Veículo Físico da Frota Disponível/i)
      fireEvent.change(selectVeic, { target: { value: 'v-exist-1' } })

      // Submete
      const submitBtn = screen.getAllByRole('button', { name: /Cadastrar Motorista/i }).find(b => b.getAttribute('type') === 'submit')!
      fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(spyCriarMotorista).toHaveBeenCalledWith({ nome: 'Marcos Souza' })
        expect(spyCriarVinculo).toHaveBeenCalledWith(
          expect.objectContaining({
            motorista_id: 'm-new-2',
            veiculo_id: 'v-exist-1',
            categoria: 'SPOT',
          })
        )
      })
    })
  })

  describe('VeiculosPage — Cadastro Casado', () => {
    it('deve cadastrar novo veículo com novo motorista casado no mesmo container', async () => {
      vi.spyOn(veiculosService, 'listar').mockResolvedValue([])
      vi.spyOn(motoristasService, 'listar').mockResolvedValue([])
      vi.spyOn(contratosService, 'listarVinculosAtivos').mockResolvedValue([])

      const spyCriarVeiculo = vi.spyOn(veiculosService, 'criar').mockResolvedValue({
        id: 'v-new-99',
        placa: 'XYZ9K88',
        tipo_veiculo: 'Truck',
        especialidade: 'SECO',
        ativo: true,
        criado_em: '2026-10-25T10:00:00Z',
        atualizado_em: '2026-10-25T10:00:00Z',
      })

      const spyCriarMotorista = vi.spyOn(motoristasService, 'criar').mockResolvedValue({
        id: 'm-new-99',
        nome: 'Antônio Peixoto',
        ativo: true,
        criado_em: '2026-10-25T10:00:00Z',
        atualizado_em: '2026-10-25T10:00:00Z',
      })

      const spyCriarVinculo = vi.spyOn(contratosService, 'criarVinculoDedicado').mockResolvedValue({
        id: 'vinc-99',
        empresa_id: undefined,
        motorista_id: 'm-new-99',
        veiculo_id: 'v-new-99',
        tipo_veiculo: 'Truck',
        categoria_operacional: 'SPOT',
        categoria: 'SPOT',
        ativo: true,
        criado_em: '2026-10-25T10:00:00Z',
        atualizado_em: '2026-10-25T10:00:00Z',
      })

      render(
        <AuthProvider>
          <MemoryRouter>
            <VeiculosPage />
          </MemoryRouter>
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Novo Veículo')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Novo Veículo'))

      // Preenche dados do veículo
      fireEvent.change(screen.getByLabelText(/Placa/i), { target: { value: 'XYZ9K88' } })
      fireEvent.change(screen.getByLabelText(/Tipo de Veículo/i), { target: { value: 'Truck' } })

      // Seleciona aba "+ Novo Motorista Casado"
      fireEvent.click(screen.getByText('+ Novo Motorista Casado'))

      // Preenche nome do novo motorista
      fireEvent.change(screen.getByLabelText(/Nome Completo do Novo Motorista/i), {
        target: { value: 'Antônio Peixoto' },
      })

      // Submete formulário
      const submitBtn = screen.getAllByRole('button', { name: /Cadastrar Veículo/i }).find(b => b.getAttribute('type') === 'submit')!
      fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(spyCriarVeiculo).toHaveBeenCalledWith({
          placa: 'XYZ9K88',
          tipo_veiculo: 'Truck',
          especialidade: 'SECO',
        })
        expect(spyCriarMotorista).toHaveBeenCalledWith({ nome: 'Antônio Peixoto' })
        expect(spyCriarVinculo).toHaveBeenCalledWith(
          expect.objectContaining({
            motorista_id: 'm-new-99',
            veiculo_id: 'v-new-99',
            tipo_veiculo: 'Truck',
            categoria: 'SPOT',
          })
        )
      })
    })

    it('deve vincular motorista existente no cadastro de novo veículo', async () => {
      vi.spyOn(veiculosService, 'listar').mockResolvedValue([])
      vi.spyOn(motoristasService, 'listar').mockResolvedValue([
        {
          id: 'm-exist-5',
          nome: 'Roberto Carlos',
          ativo: true,
          criado_em: '2026-10-25T10:00:00Z',
          atualizado_em: '2026-10-25T10:00:00Z',
        },
      ])
      vi.spyOn(contratosService, 'listarVinculosAtivos').mockResolvedValue([])

      const spyCriarVeiculo = vi.spyOn(veiculosService, 'criar').mockResolvedValue({
        id: 'v-new-100',
        placa: 'KJH3H44',
        tipo_veiculo: 'HR',
        especialidade: 'SECO',
        ativo: true,
        criado_em: '2026-10-25T10:00:00Z',
        atualizado_em: '2026-10-25T10:00:00Z',
      })

      const spyCriarVinculo = vi.spyOn(contratosService, 'criarVinculoDedicado').mockResolvedValue({
        id: 'vinc-100',
        empresa_id: undefined,
        motorista_id: 'm-exist-5',
        veiculo_id: 'v-new-100',
        tipo_veiculo: 'HR',
        categoria_operacional: 'SPOT',
        categoria: 'SPOT',
        ativo: true,
        criado_em: '2026-10-25T10:00:00Z',
        atualizado_em: '2026-10-25T10:00:00Z',
      })

      render(
        <AuthProvider>
          <MemoryRouter>
            <VeiculosPage />
          </MemoryRouter>
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Novo Veículo')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Novo Veículo'))

      fireEvent.change(screen.getByLabelText(/Placa/i), { target: { value: 'KJH3H44' } })

      // Seleciona aba "Vincular Existente"
      fireEvent.click(screen.getByText('Vincular Existente'))

      // Seleciona motorista existente
      const selectMot = screen.getByLabelText(/Motorista \(Operadores Disponíveis\)/i)
      fireEvent.change(selectMot, { target: { value: 'm-exist-5' } })

      // Submete
      const submitBtn = screen.getAllByRole('button', { name: /Cadastrar Veículo/i }).find(b => b.getAttribute('type') === 'submit')!
      fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(spyCriarVeiculo).toHaveBeenCalledWith({
          placa: 'KJH3H44',
          tipo_veiculo: 'HR',
          especialidade: 'SECO',
        })
        expect(spyCriarVinculo).toHaveBeenCalledWith(
          expect.objectContaining({
            motorista_id: 'm-exist-5',
            veiculo_id: 'v-new-100',
            categoria: 'SPOT',
          })
        )
      })
    })
  })
})
