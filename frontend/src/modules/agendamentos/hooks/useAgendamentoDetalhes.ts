import { useState, useEffect, useCallback, useMemo } from 'react'
import { agendamentosService } from '@/services/agendamentos/agendamentosService'
import { empresasService } from '@/services/empresas/empresasService'
import { motoristasService } from '@/services/motoristas/motoristasService'
import { veiculosService } from '@/services/veiculos/veiculosService'
import { motivosService } from '@/services/motivos/motivosService'
import { contratosService } from '@/services/contratos/contratosService'
import { torreService } from '@/services/torre/torreService'
import { getErrorMessage } from '@/services/api/errors'
import { toast } from '@/components/feedback/Toaster'
import { Agendamento, HistoricoAgendamento, StatusOperacional } from '@/types/agendamentos'
import { Empresa } from '@/types/empresas'
import { Motorista } from '@/types/motoristas'
import { Veiculo } from '@/types/veiculos'
import { MotivoIndisponibilidade } from '@/types/motivos'
import { MotoristaDedicadoVinculo } from '@/types/contratos'
import { DetalhamentoOperacional } from '@/types/torre'

export function useAgendamentoDetalhes(id: string | undefined) {
  const [agendamento, setAgendamento] = useState<Agendamento | null>(null)
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [historico, setHistorico] = useState<HistoricoAgendamento[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [motivos, setMotivos] = useState<MotivoIndisponibilidade[]>([])
  const [vinculosDedicados, setVinculosDedicados] = useState<MotoristaDedicadoVinculo[]>([])
  const [detalhamentoTorre, setDetalhamentoTorre] = useState<DetalhamentoOperacional[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Drawer de Adicionar / Substituir SPOT
  const [drawerSpotOpen, setDrawerSpotOpen] = useState(false)
  const [targetAlocacaoId, setTargetAlocacaoId] = useState<string | null>(null)
  const [motoristaSpotId, setMotoristaSpotId] = useState('')
  const [veiculoSpotId, setVeiculoSpotId] = useState('')
  const [submittingSpot, setSubmittingSpot] = useState(false)
  const [spotFormError, setSpotFormError] = useState<string | null>(null)

  // Drawer de Alterar Status Operacional
  const [drawerStatusOpen, setDrawerStatusOpen] = useState(false)
  const [targetAlocacaoStatusId, setTargetAlocacaoStatusId] = useState<string | null>(null)
  const [novoStatusForm, setNovoStatusForm] = useState<StatusOperacional>('PROGRAMADO')
  const [motivoIndisponibilidadeFormId, setMotivoIndisponibilidadeFormId] = useState<string>('')
  const [submittingStatus, setSubmittingStatus] = useState(false)
  const [statusFormError, setStatusFormError] = useState<string | null>(null)

  // Modal de Cancelar Agendamento
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [canceling, setCanceling] = useState(false)

  // Modal de Remover SPOT
  const [spotParaRemoverId, setSpotParaRemoverId] = useState<string | null>(null)
  const [removendoSpot, setRemovendoSpot] = useState(false)

  const carregarDetalhes = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const agData = await agendamentosService.buscarPorId(id)
      setAgendamento(agData)

      const [empData, histData, mList, vList, motList, vincList, torreList] = await Promise.all([
        empresasService.buscarPorId(agData.empresa_id).catch(() => null),
        agendamentosService.obterHistorico(agData.id).catch(() => []),
        motoristasService.listar().catch(() => []),
        veiculosService.listar().catch(() => []),
        motivosService.listarMotivos(true).catch(() => []),
        contratosService.listarVinculosAtivos().catch(() => []),
        torreService.obterDetalhamento({ data: agData.data }).catch(() => []),
      ])

      setEmpresa(empData)
      setHistorico(histData)
      setMotoristas(mList)
      setVeiculos(vList)
      setMotivos(motList)
      setVinculosDedicados(vincList)
      setDetalhamentoTorre(torreList)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erro ao carregar detalhes do agendamento.'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    carregarDetalhes()
  }, [carregarDetalhes])

  // Motoristas elegíveis para inclusão SPOT:
  // 1. Não pode ter vínculo DEDICADO ativo com NENHUMA empresa
  // 2. Não pode estar PROGRAMADO, EM_ROTA ou INDISPONÍVEL na data do agendamento
  const motoristasSpotElegiveis = useMemo(() => {
    if (!agendamento) return []

    const motoristasDedicadosSet = new Set(
      vinculosDedicados
        .filter(v => v.ativo && (v.categoria === 'DEDICADO' || v.categoria_operacional === 'DEDICADO') && v.empresa_id)
        .map(v => v.motorista_id)
    )

    const motoristasAlocadosNoAgendamento = new Set(
      agendamento.alocacoes
        .filter(a => (targetAlocacaoId ? a.id !== targetAlocacaoId : true))
        .map(a => a.motorista_id)
    )

    const motoristasOcupadosNaTorre = new Set(
      detalhamentoTorre
        .filter(d => {
          if (targetAlocacaoId && d.agendamento_id === agendamento.id) {
            const alocAlvo = agendamento.alocacoes.find(a => a.id === targetAlocacaoId)
            if (alocAlvo && alocAlvo.motorista_id === d.motorista_id) {
              return false
            }
          }
          return ['PROGRAMADO', 'EM_ROTA', 'INDISPONIVEL'].includes(d.status_operacional)
        })
        .map(d => d.motorista_id)
    )

    return motoristas.filter(m => {
      if (!m.ativo) return false
      if (motoristasDedicadosSet.has(m.id)) return false
      if (motoristasAlocadosNoAgendamento.has(m.id)) return false
      if (motoristasOcupadosNaTorre.has(m.id)) return false
      return true
    })
  }, [agendamento, vinculosDedicados, motoristas, detalhamentoTorre, targetAlocacaoId])

  // Veículos elegíveis para inclusão SPOT:
  // 1. Não pode ter vínculo DEDICADO ativo com NENHUMA empresa
  // 2. Não pode estar PROGRAMADO, EM_ROTA ou INDISPONÍVEL na data do agendamento
  const veiculosSpotElegiveis = useMemo(() => {
    if (!agendamento) return []

    const veiculosDedicadosSet = new Set(
      vinculosDedicados
        .filter(v => v.ativo && (v.categoria === 'DEDICADO' || v.categoria_operacional === 'DEDICADO') && v.empresa_id)
        .map(v => v.veiculo_id)
    )

    const veiculosAlocadosNoAgendamento = new Set(
      agendamento.alocacoes
        .filter(a => (targetAlocacaoId ? a.id !== targetAlocacaoId : true))
        .map(a => a.veiculo_id)
    )

    const veiculosOcupadosNaTorre = new Set(
      detalhamentoTorre
        .filter(d => {
          if (targetAlocacaoId && d.agendamento_id === agendamento.id) {
            const alocAlvo = agendamento.alocacoes.find(a => a.id === targetAlocacaoId)
            if (alocAlvo && alocAlvo.veiculo_id === d.veiculo_id) {
              return false
            }
          }
          return ['PROGRAMADO', 'EM_ROTA', 'INDISPONIVEL'].includes(d.status_operacional)
        })
        .map(d => d.veiculo_id)
    )

    return veiculos.filter(v => {
      if (!v.ativo) return false
      if (veiculosDedicadosSet.has(v.id)) return false
      if (veiculosAlocadosNoAgendamento.has(v.id)) return false
      if (veiculosOcupadosNaTorre.has(v.id)) return false
      return true
    })
  }, [agendamento, vinculosDedicados, veiculos, detalhamentoTorre, targetAlocacaoId])

  const handleSelectMotoristaSpot = (motId: string) => {
    setMotoristaSpotId(motId)
    if (motId) {
      const vinculo = vinculosDedicados.find(v => v.motorista_id === motId && v.ativo)
      if (vinculo && vinculo.veiculo_id) {
        const veiculoDisponivel = veiculosSpotElegiveis.some(v => v.id === vinculo.veiculo_id)
        if (veiculoDisponivel) {
          setVeiculoSpotId(vinculo.veiculo_id)
        }
      }
    }
  }

  const handleSelectVeiculoSpot = (vecId: string) => {
    setVeiculoSpotId(vecId)
    if (vecId) {
      const vinculo = vinculosDedicados.find(v => v.veiculo_id === vecId && v.ativo)
      if (vinculo && vinculo.motorista_id) {
        const motoristaDisponivel = motoristasSpotElegiveis.some(m => m.id === vinculo.motorista_id)
        if (motoristaDisponivel) {
          setMotoristaSpotId(vinculo.motorista_id)
        }
      }
    }
  }

  const handleOpenAdicionarSpot = () => {
    setTargetAlocacaoId(null)
    setMotoristaSpotId('')
    setVeiculoSpotId('')
    setSpotFormError(null)
    setDrawerSpotOpen(true)
  }

  const handleOpenSubstituirSpot = (alocacaoId: string) => {
    setTargetAlocacaoId(alocacaoId)
    setMotoristaSpotId('')
    setVeiculoSpotId('')
    setSpotFormError(null)
    setDrawerSpotOpen(true)
  }

  const handleSalvarSpot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agendamento || !motoristaSpotId || !veiculoSpotId) {
      setSpotFormError('Selecione o motorista e o veículo SPOT.')
      return
    }

    setSubmittingSpot(true)
    setSpotFormError(null)
    try {
      if (targetAlocacaoId) {
        await agendamentosService.substituirSpot(targetAlocacaoId, {
          motorista_id: motoristaSpotId,
          veiculo_id: veiculoSpotId,
          categoria: 'SPOT',
        })
        toast.success('Recurso SPOT substituído com sucesso!')
      } else {
        await agendamentosService.adicionarSpot(agendamento.id, {
          motorista_id: motoristaSpotId,
          veiculo_id: veiculoSpotId,
          categoria: 'SPOT',
        })
        toast.success('Recurso SPOT adicionado à programação!')
      }
      setDrawerSpotOpen(false)
      carregarDetalhes()
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Este recurso ou veículo não está disponível para esta alocação.')
      setSpotFormError(msg)
      toast.error(msg)
    } finally {
      setSubmittingSpot(false)
    }
  }

  const handleRemoverSpot = (alocacaoId: string) => {
    setSpotParaRemoverId(alocacaoId)
  }

  const handleConfirmarRemoverSpot = async () => {
    if (!spotParaRemoverId) return
    setRemovendoSpot(true)
    setError(null)
    try {
      await agendamentosService.removerSpot(spotParaRemoverId)
      setSpotParaRemoverId(null)
      toast.success('Alocação SPOT removida com sucesso.')
      carregarDetalhes()
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Erro ao remover alocação SPOT.')
      setError(msg)
      toast.error(msg)
      setSpotParaRemoverId(null)
    } finally {
      setRemovendoSpot(false)
    }
  }

  const handleConfirmarCancelamento = async () => {
    if (!agendamento) return
    setCanceling(true)
    setError(null)
    try {
      await agendamentosService.cancelar(agendamento.id)
      setCancelModalOpen(false)
      toast.success('Agendamento cancelado com sucesso.')
      carregarDetalhes()
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Erro ao cancelar agendamento.')
      setError(msg)
      toast.error(msg)
    } finally {
      setCanceling(false)
    }
  }

  const getPermittedNextStatuses = (currentStatus: string): StatusOperacional[] => {
    switch (currentStatus) {
      case 'DISPONIVEL':
        return ['PROGRAMADO', 'INDISPONIVEL']
      case 'PROGRAMADO':
        return ['EM_ROTA', 'INDISPONIVEL', 'DISPONIVEL']
      case 'EM_ROTA':
        return ['DISPONIVEL', 'INDISPONIVEL']
      case 'INDISPONIVEL':
        return ['DISPONIVEL', 'PROGRAMADO']
      default:
        return ['PROGRAMADO', 'EM_ROTA', 'INDISPONIVEL', 'DISPONIVEL']
    }
  }

  const handleOpenAlterarStatus = (alocacaoId: string, currentStatus: string) => {
    setTargetAlocacaoStatusId(alocacaoId)
    const allowed = getPermittedNextStatuses(currentStatus)
    setNovoStatusForm(allowed[0] || 'INDISPONIVEL')
    setMotivoIndisponibilidadeFormId(motivos.length > 0 ? motivos[0].id : '')
    setStatusFormError(null)
    setDrawerStatusOpen(true)
  }

  const handleSalvarStatusOperacional = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetAlocacaoStatusId) return

    if (novoStatusForm === 'INDISPONIVEL' && !motivoIndisponibilidadeFormId) {
      setStatusFormError('Selecione um motivo de indisponibilidade.')
      return
    }

    setSubmittingStatus(true)
    setStatusFormError(null)
    try {
      await agendamentosService.atualizarStatusOperacional(targetAlocacaoStatusId, {
        novo_status: novoStatusForm,
        motivo_indisponibilidade_id: novoStatusForm === 'INDISPONIVEL' ? motivoIndisponibilidadeFormId : undefined,
        origem_alteracao: 'painel_operacional',
      })
      toast.success(`Status operacional atualizado para ${novoStatusForm}!`)
      setDrawerStatusOpen(false)
      carregarDetalhes()
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Erro ao atualizar status operacional.')
      setStatusFormError(msg)
      toast.error(msg)
    } finally {
      setSubmittingStatus(false)
    }
  }

  const getMotoristaNome = (mId: string) => motoristas.find(m => m.id === mId)?.nome || 'Motorista'
  const getVeiculoInfo = (vId: string) => {
    const v = veiculos.find(ve => ve.id === vId)
    return v ? `${v.tipo_veiculo} [${v.placa}]` : 'Veículo'
  }

  return {
    agendamento,
    empresa,
    historico,
    motoristas,
    veiculos,
    motivos,
    vinculosDedicados,
    detalhamentoTorre,
    loading,
    error,
    carregarDetalhes,
    motoristasSpotElegiveis,
    veiculosSpotElegiveis,
    // Drawer SPOT
    drawerSpotOpen,
    setDrawerSpotOpen,
    targetAlocacaoId,
    motoristaSpotId,
    setMotoristaSpotId,
    veiculoSpotId,
    setVeiculoSpotId,
    submittingSpot,
    spotFormError,
    handleSelectMotoristaSpot,
    handleSelectVeiculoSpot,
    handleOpenAdicionarSpot,
    handleOpenSubstituirSpot,
    handleSalvarSpot,
    // Drawer Status
    drawerStatusOpen,
    setDrawerStatusOpen,
    targetAlocacaoStatusId,
    novoStatusForm,
    setNovoStatusForm,
    motivoIndisponibilidadeFormId,
    setMotivoIndisponibilidadeFormId,
    submittingStatus,
    statusFormError,
    handleOpenAlterarStatus,
    handleSalvarStatusOperacional,
    // Remover Spot
    spotParaRemoverId,
    setSpotParaRemoverId,
    removendoSpot,
    handleRemoverSpot,
    handleConfirmarRemoverSpot,
    // Cancelamento
    cancelModalOpen,
    setCancelModalOpen,
    canceling,
    handleConfirmarCancelamento,
    // Helpers
    getMotoristaNome,
    getVeiculoInfo,
    getPermittedNextStatuses,
  }
}
