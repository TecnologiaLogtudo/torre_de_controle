import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { agendamentosService } from '@/services/agendamentos/agendamentosService'
import { empresasService } from '@/services/empresas/empresasService'
import { motoristasService } from '@/services/motoristas/motoristasService'
import { veiculosService } from '@/services/veiculos/veiculosService'
import { motivosService } from '@/services/motivos/motivosService'
import { contratosService } from '@/services/contratos/contratosService'
import { Agendamento, HistoricoAgendamento } from '@/types/agendamentos'
import { Empresa } from '@/types/empresas'
import { Motorista } from '@/types/motoristas'
import { Veiculo } from '@/types/veiculos'
import { MotivoIndisponibilidade } from '@/types/motivos'
import { MotoristaDedicadoVinculo } from '@/types/contratos'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Drawer } from '@/components/ui/Drawer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Alert } from '@/components/ui/Alert'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatToBahia } from '@/utils/date'
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  RefreshCw,
  History,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Truck,
  UserCheck,
  Activity,
} from 'lucide-react'

export const AgendamentoDetalhesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [agendamento, setAgendamento] = useState<Agendamento | null>(null)
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [historico, setHistorico] = useState<HistoricoAgendamento[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [motivos, setMotivos] = useState<MotivoIndisponibilidade[]>([])
  const [vinculosDedicados, setVinculosDedicados] = useState<MotoristaDedicadoVinculo[]>([])
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
  const [novoStatusForm, setNovoStatusForm] = useState<string>('PROGRAMADO')
  const [motivoIndisponibilidadeFormId, setMotivoIndisponibilidadeFormId] = useState<string>('')
  const [submittingStatus, setSubmittingStatus] = useState(false)
  const [statusFormError, setStatusFormError] = useState<string | null>(null)

  // Modal de Cancelar Agendamento
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [canceling, setCanceling] = useState(false)

  const carregarDetalhes = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const agData = await agendamentosService.buscarPorId(id)
      setAgendamento(agData)

      const [empData, histData, mList, vList, motList, vincList] = await Promise.all([
        empresasService.buscarPorId(agData.empresa_id).catch(() => null),
        agendamentosService.obterHistorico(agData.id).catch(() => []),
        motoristasService.listar().catch(() => []),
        veiculosService.listar().catch(() => []),
        motivosService.listarMotivos(true).catch(() => []),
        contratosService.listarVinculosAtivos().catch(() => []),
      ])

      setEmpresa(empData)
      setHistorico(histData)
      setMotoristas(mList)
      setVeiculos(vList)
      setMotivos(motList)
      setVinculosDedicados(vincList)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar detalhes do agendamento.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    carregarDetalhes()
  }, [carregarDetalhes])

  // Motoristas elegíveis para inclusão SPOT:
  // 1. Não pode ter vínculo DEDICADO ativo com NENHUMA empresa
  // 2. Não pode estar INDISPONÍVEL nem alocado no agendamento atual
  const motoristasSpotElegiveis = useMemo(() => {
    if (!agendamento) return []
    
    // IDs de motoristas com vínculo DEDICADO ativo
    const motoristasDedicadosSet = new Set(
      vinculosDedicados
        .filter(v => v.ativo && (v.categoria === 'DEDICADO' || v.categoria_operacional === 'DEDICADO'))
        .map(v => v.motorista_id)
    )

    // IDs de motoristas já alocados no agendamento atual
    const motoristasAlocadosNoAgendamento = new Set(
      agendamento.alocacoes
        .filter(a => targetAlocacaoId ? a.id !== targetAlocacaoId : true)
        .map(a => a.motorista_id)
    )

    return motoristas.filter(m => {
      if (!m.ativo) return false
      if (motoristasDedicadosSet.has(m.id)) return false
      if (motoristasAlocadosNoAgendamento.has(m.id)) return false
      return true
    })
  }, [agendamento, vinculosDedicados, motoristas, targetAlocacaoId])

  // Veículos elegíveis para inclusão SPOT:
  // 1. Não pode ter vínculo DEDICADO ativo com NENHUMA empresa
  // 2. Não pode estar alocado no agendamento atual
  const veiculosSpotElegiveis = useMemo(() => {
    if (!agendamento) return []

    // IDs de veículos com vínculo DEDICADO ativo
    const veiculosDedicadosSet = new Set(
      vinculosDedicados
        .filter(v => v.ativo && (v.categoria === 'DEDICADO' || v.categoria_operacional === 'DEDICADO'))
        .map(v => v.veiculo_id)
    )

    // IDs de veículos já alocados no agendamento atual
    const veiculosAlocadosNoAgendamento = new Set(
      agendamento.alocacoes
        .filter(a => targetAlocacaoId ? a.id !== targetAlocacaoId : true)
        .map(a => a.veiculo_id)
    )

    return veiculos.filter(v => {
      if (veiculosDedicadosSet.has(v.id)) return false
      if (veiculosAlocadosNoAgendamento.has(v.id)) return false
      return true
    })
  }, [agendamento, vinculosDedicados, veiculos, targetAlocacaoId])

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
      } else {
        await agendamentosService.adicionarSpot(agendamento.id, {
          motorista_id: motoristaSpotId,
          veiculo_id: veiculoSpotId,
          categoria: 'SPOT',
        })
      }
      setDrawerSpotOpen(false)
      carregarDetalhes()
    } catch (err: any) {
      setSpotFormError(err.message || 'Este recurso ou veículo não está disponível para esta alocação.')
    } finally {
      setSubmittingSpot(false)
    }
  }

  const handleRemoverSpot = async (alocacaoId: string) => {
    if (!confirm('Deseja realmente remover esta alocação SPOT?')) return
    try {
      await agendamentosService.removerSpot(alocacaoId)
      carregarDetalhes()
    } catch (err: any) {
      alert(err.message || 'Erro ao remover alocação SPOT.')
    }
  }

  const handleConfirmarCancelamento = async () => {
    if (!agendamento) return
    setCanceling(true)
    try {
      await agendamentosService.cancelar(agendamento.id)
      setCancelModalOpen(false)
      carregarDetalhes()
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar agendamento.')
    } finally {
      setCanceling(false)
    }
  }

  const getPermittedNextStatuses = (currentStatus: string) => {
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
        novo_status: novoStatusForm as any,
        motivo_indisponibilidade_id: novoStatusForm === 'INDISPONIVEL' ? motivoIndisponibilidadeFormId : undefined,
        origem_alteracao: 'painel_operacional',
      })
      setDrawerStatusOpen(false)
      carregarDetalhes()
    } catch (err: any) {
      setStatusFormError(err.message || 'Erro ao atualizar status operacional.')
    } finally {
      setSubmittingStatus(false)
    }
  }

  const getMotoristaNome = (mId: string) => motoristas.find(m => m.id === mId)?.nome || 'Motorista'
  const getVeiculoInfo = (vId: string) => {
    const v = veiculos.find(ve => ve.id === vId)
    return v ? `${v.tipo_veiculo} [${v.placa}]` : 'Veículo'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !agendamento) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/app/agendamentos')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Voltar para Agendamentos
        </Button>
        <Alert type="error">{error || 'Agendamento não encontrado.'}</Alert>
      </div>
    )
  }

  const alocacoesDedicadas = agendamento.alocacoes.filter(a => a.categoria === 'DEDICADO')
  const alocacoesSpot = agendamento.alocacoes.filter(a => a.categoria === 'SPOT')

  return (
    <div className="space-y-6">
      {/* Botão Voltar + Cabeçalho da Página */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/app/agendamentos')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Voltar
        </Button>
        <PageHeader
          title={`Agendamento #${agendamento.id.slice(0, 8)}`}
          subtitle={`Programação para ${empresa?.nome || 'Empresa'}`}
          badge={<StatusBadge status={agendamento.status} />}
          actions={
            agendamento.status !== 'CANCELADO' && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setCancelModalOpen(true)}
                leftIcon={<XCircle className="w-4 h-4" />}
              >
                Cancelar Agendamento
              </Button>
            )
          }
        />
      </div>

      {/* Card de Resumo da Programação */}
      <Card className="bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/20 border-sky-800/40">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Empresa Contratante:</span>
            <span className="font-bold text-slate-100 text-sm">{empresa?.nome}</span>
            <span className="text-slate-500 block font-mono">{empresa?.identificacao}</span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Data da Programação:</span>
            <span className="font-mono font-bold text-slate-200 text-sm flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-sky-400" />
              {formatToBahia(agendamento.data, { hour: undefined, minute: undefined, second: undefined })}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Horário de Início:</span>
            <span className="font-mono font-bold text-sky-400 text-sm flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sky-400" />
              {agendamento.horario_inicio}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Total de Alocações:</span>
            <span className="font-bold text-emerald-400 text-sm">
              {agendamento.alocacoes.length} Veículos / Motoristas
            </span>
          </div>
        </div>
      </Card>

      {/* Seção 1: Composição Contratual de Dedicados por Vaga */}
      <Card
        title="Composição Contratual de Dedicados (Preenchimento por Vaga)"
        subtitle="Vagas da empresa atreladas aos recursos dedicados associados"
      >
        {alocacoesDedicadas.length === 0 ? (
          <div className="p-4 bg-slate-950 rounded-lg border border-dashed border-slate-800 text-center text-xs text-slate-400">
            Nenhuma alocação dedicada ativa registrada para este agendamento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alocacoesDedicadas.map((aloc, idx) => {
              const isIndisponivel = aloc.status_operacional === 'INDISPONIVEL'
              const motivo = motivos.find(m => m.id === aloc.motivo_indisponibilidade_id)

              return (
                <div
                  key={aloc.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    isIndisponivel
                      ? 'bg-red-950/20 border-red-800/60'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300">
                      VAGA DEDICADA #{idx + 1}
                    </span>
                    <StatusBadge status={aloc.status_operacional} />
                  </div>

                  <div className="space-y-1.5 text-xs mb-3">
                    <div className="flex items-center gap-2 font-semibold text-slate-100">
                      <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{getMotoristaNome(aloc.motorista_id)}</span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-sky-400">
                      <Truck className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>{getVeiculoInfo(aloc.veiculo_id)}</span>
                    </div>

                    {isIndisponivel && (
                      <div className="p-2 bg-red-950/60 border border-red-800/60 rounded text-[11px] text-red-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span>
                          <strong>RECURSO INDISPONÍVEL:</strong> {motivo?.nome || 'Motivo operacional registrado'} (A vaga permanece ocupada pela composição contratual).
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAlterarStatus(aloc.id, aloc.status_operacional)}
                      leftIcon={<Activity className="w-3.5 h-3.5" />}
                    >
                      Alterar Status Operacional
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Seção 2: Alocações SPOT */}
      <Card
        title="Alocações SPOT (Recursos Adicionais)"
        subtitle="Inclusão e substituição de recursos SPOT complementares"
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAdicionarSpot}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Adicionar SPOT
          </Button>
        }
      >
        {alocacoesSpot.length === 0 ? (
          <div className="p-4 bg-slate-950 rounded-lg border border-dashed border-slate-800 text-center text-xs text-slate-400">
            Nenhum recurso SPOT adicionado a esta programação ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {alocacoesSpot.map(spot => (
              <div
                key={spot.id}
                className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="EM_BREVE">SPOT</Badge>
                    <span className="font-bold text-slate-100 text-sm">
                      {getMotoristaNome(spot.motorista_id)}
                    </span>
                  </div>
                  <div className="font-mono text-sky-400">
                    {getVeiculoInfo(spot.veiculo_id)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={spot.status_operacional} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenAlterarStatus(spot.id, spot.status_operacional)}
                    leftIcon={<Activity className="w-3.5 h-3.5" />}
                  >
                    Alterar Status
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenSubstituirSpot(spot.id)}
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  >
                    Substituir SPOT
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoverSpot(spot.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-950/40"
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Seção 3: Histórico de Alterações */}
      <Card
        title="Histórico de Alterações da Programação"
        subtitle="Trilha de modificações com exibição de horário no fuso America/Bahia"
      >
        {historico.length === 0 ? (
          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-center text-xs text-slate-400">
            Nenhum evento registrado no histórico deste agendamento.
          </div>
        ) : (
          <div className="space-y-3">
            {historico.map(h => (
              <div key={h.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3 text-xs">
                <History className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-200 uppercase tracking-wider">{h.tipo_alteracao}</span>
                    <span className="font-mono text-slate-400">{formatToBahia(h.criado_em)}</span>
                  </div>
                  <p className="text-slate-300">{h.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Drawer Adicionar / Substituir SPOT */}
      <Drawer
        isOpen={drawerSpotOpen}
        onClose={() => setDrawerSpotOpen(false)}
        title={targetAlocacaoId ? 'Substituir Alocação SPOT' : 'Adicionar Recurso SPOT'}
        subtitle="Selecione o motorista e veículo para alocação SPOT"
      >
        <form onSubmit={handleSalvarSpot} className="space-y-4">
          {spotFormError && <Alert type="error">{spotFormError}</Alert>}

          <Select
            label="Motorista SPOT (Apenas Não-Dedicados e Livres)"
            value={motoristaSpotId}
            onChange={e => setMotoristaSpotId(e.target.value)}
            placeholder="Selecione o motorista..."
            options={motoristasSpotElegiveis.map(m => ({ value: m.id, label: m.nome }))}
            required
          />

          <Select
            label="Veículo SPOT (Apenas Não-Dedicados e Livres)"
            value={veiculoSpotId}
            onChange={e => setVeiculoSpotId(e.target.value)}
            placeholder="Selecione o veículo..."
            options={veiculosSpotElegiveis.map(v => ({
              value: v.id,
              label: `${v.tipo_veiculo} - ${v.identificacao} [${v.placa}] (${v.especialidade})`,
            }))}
            required
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setDrawerSpotOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="primary" size="sm" isLoading={submittingSpot} type="submit">
              {targetAlocacaoId ? 'Confirmar Substituição' : 'Adicionar SPOT'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Drawer Alterar Status Operacional */}
      <Drawer
        isOpen={drawerStatusOpen}
        onClose={() => setDrawerStatusOpen(false)}
        title="Alterar Status Operacional"
        subtitle="Atualize a situação do recurso e registre eventos auditáveis"
      >
        <form onSubmit={handleSalvarStatusOperacional} className="space-y-4">
          {statusFormError && <Alert type="error">{statusFormError}</Alert>}

          <Select
            label="Novo Status Operacional"
            value={novoStatusForm}
            onChange={e => setNovoStatusForm(e.target.value)}
            options={getPermittedNextStatuses(
              agendamento?.alocacoes.find(a => a.id === targetAlocacaoStatusId)?.status_operacional || 'PROGRAMADO'
            ).map(st => ({
              value: st,
              label:
                st === 'INDISPONIVEL'
                  ? 'INDISPONÍVEL (Registrar Motivo)'
                  : st === 'EM_ROTA'
                  ? 'EM ROTA (Em Viagem)'
                  : st === 'PROGRAMADO'
                  ? 'PROGRAMADO (Na Escala)'
                  : 'DISPONÍVEL (Livre)',
            }))}
            required
          />

          {novoStatusForm === 'INDISPONIVEL' && (
            <Select
              label="Motivo de Indisponibilidade"
              value={motivoIndisponibilidadeFormId}
              onChange={e => setMotivoIndisponibilidadeFormId(e.target.value)}
              placeholder="Selecione o motivo..."
              options={motivos.map(m => ({ value: m.id, label: m.nome }))}
              required
            />
          )}

          <div className="p-3 bg-sky-950/40 border border-sky-800/60 rounded-lg text-xs text-sky-300">
            <strong>Trilha de Auditoria:</strong> Toda transição gera um evento operacional imutável com timestamp em <code>America/Bahia</code>.
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setDrawerStatusOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="primary" size="sm" isLoading={submittingStatus} type="submit">
              Confirmar Alteração
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Modal de Cancelamento */}
      <ConfirmDialog
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmarCancelamento}
        title="Cancelar Agendamento"
        message="Tem certeza que deseja cancelar esta programação operacional? Esta ação encerrará as alocações vinculadas."
        confirmText="Sim, Cancelar"
        cancelText="Voltar"
        variant="danger"
        isLoading={canceling}
      />
    </div>
  )
}
