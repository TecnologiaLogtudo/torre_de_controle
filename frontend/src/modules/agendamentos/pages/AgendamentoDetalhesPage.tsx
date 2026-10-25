import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAgendamentoDetalhes } from '../hooks/useAgendamentoDetalhes'
import { StatusOperacional } from '@/types/agendamentos'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusBadge, PerfilBadge } from '@/components/ui/StatusBadge'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Drawer } from '@/components/ui/Drawer'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Alert } from '@/components/ui/Alert'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatToBahia, formatDateBahia } from '@/utils/date'
import { agendamentosService } from '@/services/agendamentos/agendamentosService'
import { torreService } from '@/services/torre/torreService'
import { toast } from '@/components/feedback/Toaster'
import { getErrorMessage } from '@/services/api/errors'
import { useNavigationGuard } from '@/app/providers/NavigationGuardProvider'
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
  CheckCircle2,
  Save,
  Layers,
  CheckSquare,
  Square,
  RotateCcw,
} from 'lucide-react'

export const AgendamentoDetalhesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    setBlocked,
    requestNavigation,
    pendingNavigation,
    clearPendingNavigation,
  } = useNavigationGuard()

  const {
    agendamento,
    empresa,
    historico,
    motoristas,
    veiculos,
    motivos,
    loading,
    error,
    motoristasSpotElegiveis,
    veiculosSpotElegiveis,
    alteracoesNaoSalvasEstruturais,
    handleDesfazerAlteracoes,
    handleSalvarVersaoOficial,
    revertendoAlteracoes,
    drawerSpotOpen,
    setDrawerSpotOpen,
    targetAlocacaoId,
    motoristaSpotId,
    veiculoSpotId,
    submittingSpot,
    spotFormError,
    handleSelectMotoristaSpot,
    handleSelectVeiculoSpot,
    handleOpenAdicionarSpot,
    handleOpenSubstituirSpot,
    handleSalvarSpot,
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
    drawerTrocaVeiculoOpen,
    setDrawerTrocaVeiculoOpen,
    novoVeiculoIdForm,
    setNovoVeiculoIdForm,
    motivoTrocaForm,
    setMotivoTrocaForm,
    submittingTroca,
    trocaFormError,
    handleOpenTrocarVeiculo,
    handleSalvarTrocaVeiculo,
    spotParaRemoverId,
    setSpotParaRemoverId,
    removendoSpot,
    handleRemoverSpot,
    handleConfirmarRemoverSpot,
    cancelModalOpen,
    setCancelModalOpen,
    canceling,
    handleConfirmarCancelamento,
    getMotoristaNome,
    getVeiculoInfo,
    getVeiculoObj,
    getPermittedNextStatuses,
    carregarDetalhes,
  } = useAgendamentoDetalhes(id)

  // Sincroniza a guarda de navegação global com alterações estruturais não salvas (Item 3)
  React.useEffect(() => {
    setBlocked(alteracoesNaoSalvasEstruturais)
    return () => setBlocked(false)
  }, [alteracoesNaoSalvasEstruturais, setBlocked])

  // Estado para Salvamento Formal e Versionamento
  const [salvandoVersao, setSalvandoVersao] = React.useState(false)

  // Estado para Conclusão de Agendamento
  const [concluirModalOpen, setConcluirModalOpen] = React.useState(false)
  const [concluindo, setConcluindo] = React.useState(false)

  const handleConfirmarConclusao = async () => {
    if (!agendamento) return
    setConcluindo(true)
    try {
      await agendamentosService.concluir(agendamento.id)
      toast.success('Agendamento concluído com sucesso! Recursos liberados na Torre mantendo histórico estático.')
      setConcluirModalOpen(false)
      await carregarDetalhes(true)
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erro ao concluir agendamento.'))
    } finally {
      setConcluindo(false)
    }
  }

  // Estado para Seleção e Ação em Lote
  const [selectedAlocacoes, setSelectedAlocacoes] = React.useState<string[]>([])
  const [drawerLoteOpen, setDrawerLoteOpen] = React.useState(false)
  const [loteNovoStatus, setLoteNovoStatus] = React.useState<StatusOperacional>('PROGRAMADO')
  const [loteMotivoId, setLoteMotivoId] = React.useState<string>('')
  const [submittingLote, setSubmittingLote] = React.useState(false)
  const [loteFormError, setLoteFormError] = React.useState<string | null>(null)

  const handleSalvarVersao = async () => {
    if (!agendamento) return
    setSalvandoVersao(true)
    try {
      const atualizado = await handleSalvarVersaoOficial()
      toast.success(`Agendamento salvo com sucesso! Nova versão oficial: v${atualizado?.versao ?? 1}`)
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erro ao salvar agendamento.'))
      throw err
    } finally {
      setSalvandoVersao(false)
    }
  }

  const handleVoltar = () => {
    if (alteracoesNaoSalvasEstruturais) {
      requestNavigation('/app/agendamentos', () => navigate('/app/agendamentos'))
    } else {
      navigate('/app/agendamentos')
    }
  }

  const handleSalvarESair = async () => {
    try {
      await handleSalvarVersao()
      if (pendingNavigation) {
        const dest = pendingNavigation.targetUrl
        clearPendingNavigation()
        navigate(dest)
      } else {
        navigate('/app/agendamentos')
      }
    } catch {
      // Erro já notificado
    }
  }

  const handleDesfazerESair = async () => {
    try {
      await handleDesfazerAlteracoes()
      if (pendingNavigation) {
        const dest = pendingNavigation.targetUrl
        clearPendingNavigation()
        navigate(dest)
      } else {
        navigate('/app/agendamentos')
      }
    } catch {
      // Erro já notificado
    }
  }

  const toggleSelectAlocacao = (alocId: string) => {
    setSelectedAlocacoes(prev =>
      prev.includes(alocId) ? prev.filter(id => id !== alocId) : [...prev, alocId]
    )
  }

  const handleToggleSelectAll = () => {
    if (!agendamento) return
    const todasIds = agendamento.alocacoes.map(a => a.id)
    if (selectedAlocacoes.length === todasIds.length) {
      setSelectedAlocacoes([])
    } else {
      setSelectedAlocacoes(todasIds)
    }
  }

  const alocacoesDedicadas = React.useMemo(
    () => (agendamento ? agendamento.alocacoes.filter(a => a.categoria === 'DEDICADO') : []),
    [agendamento]
  )

  const alocacoesSpot = React.useMemo(
    () => (agendamento ? agendamento.alocacoes.filter(a => a.categoria === 'SPOT') : []),
    [agendamento]
  )

  // Item 4: Seleção rápida por categoria
  const handleToggleSelectAllDedicados = () => {
    const dedicadosIds = alocacoesDedicadas.map(a => a.id)
    const todosDedicadosSelecionados = dedicadosIds.length > 0 && dedicadosIds.every(id => selectedAlocacoes.includes(id))
    if (todosDedicadosSelecionados) {
      setSelectedAlocacoes(prev => prev.filter(id => !dedicadosIds.includes(id)))
    } else {
      setSelectedAlocacoes(prev => Array.from(new Set([...prev, ...dedicadosIds])))
    }
  }

  const handleToggleSelectAllSpot = () => {
    const spotIds = alocacoesSpot.map(a => a.id)
    const todosSpotSelecionados = spotIds.length > 0 && spotIds.every(id => selectedAlocacoes.includes(id))
    if (todosSpotSelecionados) {
      setSelectedAlocacoes(prev => prev.filter(id => !spotIds.includes(id)))
    } else {
      setSelectedAlocacoes(prev => Array.from(new Set([...prev, ...spotIds])))
    }
  }

  const handleSalvarStatusLote = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoteFormError(null)

    if (selectedAlocacoes.length === 0) {
      setLoteFormError('Nenhuma vaga selecionada.')
      return
    }

    if (loteNovoStatus === 'INDISPONIVEL' && !loteMotivoId) {
      setLoteFormError('Selecione o motivo de indisponibilidade.')
      return
    }

    setSubmittingLote(true)
    try {
      await torreService.atualizarStatusLote({
        alocacao_ids: selectedAlocacoes,
        novo_status: loteNovoStatus,
        motivo_indisponibilidade_id: loteNovoStatus === 'INDISPONIVEL' ? loteMotivoId : undefined,
        origem_alteracao: 'agendamento_lote',
      })
      toast.success(`Status de ${selectedAlocacoes.length} vaga(s) atualizado para ${loteNovoStatus}!`)
      setSelectedAlocacoes([])
      setDrawerLoteOpen(false)
      await carregarDetalhes(false)
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Erro ao atualizar status em lote.')
      setLoteFormError(msg)
      toast.error(msg)
    } finally {
      setSubmittingLote(false)
    }
  }

  const historicoOrdenado = React.useMemo(() => {
    return [...historico].sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
  }, [historico])

  const formatarDescricaoHistorico = (descricao: string) => {
    let texto = descricao
    motoristas.forEach(m => {
      if (m.id && texto.includes(m.id)) {
        texto = texto.split(m.id).join(`Motorista "${m.nome}"`)
      }
    })
    veiculos.forEach(v => {
      if (v.id && texto.includes(v.id)) {
        texto = texto.split(v.id).join(`Veículo "${v.tipo_veiculo} [${v.placa}]"`)
      }
    })
    return texto
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

  return (
    <div className="space-y-6 pb-20">
      {/* Botão Voltar + Cabeçalho da Página */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={handleVoltar} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Voltar
        </Button>
        <PageHeader
          title={`Agendamento #${agendamento.id.slice(0, 8)}`}
          subtitle={`Programação para ${empresa?.nome || 'Empresa'}`}
          badge={
            <div className="flex items-center gap-2">
              {agendamento.versao && agendamento.versao > 0 ? (
                <span
                  className="px-2 py-0.5 rounded-none text-xs font-mono font-bold bg-slate-100 text-sky-700 border border-slate-300"
                  title="Versão Oficial do Agendamento"
                >
                  v{agendamento.versao}
                </span>
              ) : (
                <span
                  className="px-2 py-0.5 rounded-none text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300"
                  title="Agendamento criado mas ainda não salvo oficialmente"
                >
                  Pendente de Salvar (v1)
                </span>
              )}
              <StatusBadge status={agendamento.status} />
            </div>
          }
          actions={
            agendamento.status !== 'CANCELADO' && agendamento.status !== 'CONCLUIDO' && (
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSalvarVersao}
                  isLoading={salvandoVersao}
                  leftIcon={<Save className="w-4 h-4" />}
                  title={!agendamento.versao || agendamento.versao === 0 ? 'Salvar agendamento e oficializar versão v1' : 'Salvar alterações e gerar uma nova versão oficial da escala'}
                >
                  {!agendamento.versao || agendamento.versao === 0 ? 'Salvar Agendamento (Oficializar v1)' : 'Salvar Agendamento'}
                </Button>
                {agendamento.versao && agendamento.versao >= 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => setConcluirModalOpen(true)}
                    leftIcon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  >
                    Concluir Agendamento
                  </Button>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setCancelModalOpen(true)}
                  leftIcon={<XCircle className="w-4 h-4" />}
                >
                  Cancelar Agendamento
                </Button>
              </div>
            )
          }
        />
      </div>

      {alteracoesNaoSalvasEstruturais && (
        <Alert type="info">
          Existem modificações recentes na composição de recursos (adição/substituição/remoção). Clique em <strong>"Salvar Agendamento"</strong> acima para registrar oficialmente a nova versão da escala.
        </Alert>
      )}

      {/* Barra Superior de Seleção Geral (Item 4) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 p-2.5 border border-slate-300">
        <div className="flex items-center gap-2 text-xs">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleSelectAll}
            leftIcon={selectedAlocacoes.length === agendamento.alocacoes.length ? <CheckSquare className="w-4 h-4 text-sky-600" /> : <Square className="w-4 h-4 text-slate-500" />}
          >
            {selectedAlocacoes.length === agendamento.alocacoes.length ? 'Desmarcar Todas as Vagas' : 'Selecionar Todas as Vagas do Agendamento'}
          </Button>
          {selectedAlocacoes.length > 0 && (
            <span className="font-semibold text-slate-700">
              ({selectedAlocacoes.length} de {agendamento.alocacoes.length} vaga(s) selecionada(s))
            </span>
          )}
        </div>

        {selectedAlocacoes.length > 0 && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setLoteFormError(null)
              setDrawerLoteOpen(true)
            }}
            leftIcon={<Layers className="w-4 h-4" />}
          >
            Alterar Status em Lote ({selectedAlocacoes.length})
          </Button>
        )}
      </div>

      {/* Card de Resumo da Programação */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block mb-0.5">Empresa Contratante:</span>
            <span className="font-bold text-slate-900 text-sm">{empresa?.nome}</span>
            <span className="text-slate-500 block font-mono">{empresa?.identificacao}</span>
          </div>

          <div>
            <span className="text-slate-500 block mb-0.5">Data da Programação:</span>
            <span className="font-mono font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-sky-600" />
              {formatDateBahia(agendamento.data)}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block mb-0.5">Horário de Início:</span>
            <span className="font-mono font-bold text-sky-700 text-sm flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sky-600" />
              {agendamento.horario_inicio}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block mb-0.5">Total de Alocações:</span>
            <span className="font-bold text-emerald-700 text-sm">
              {agendamento.alocacoes.length} Veículos / Motoristas
            </span>
          </div>
        </div>
      </Card>

      {/* Seção 1: Composição Contratual de Dedicados por Vaga (Item 4: Selecionar Todos os Dedicados) */}
      <Card
        title="Composição Contratual de Dedicados (Preenchimento por Vaga)"
        subtitle="Vagas da empresa atreladas aos recursos dedicados associados"
        className="bg-white border-slate-200 shadow-sm"
        action={
          alocacoesDedicadas.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleSelectAllDedicados}
              leftIcon={
                alocacoesDedicadas.every(a => selectedAlocacoes.includes(a.id)) ? (
                  <CheckSquare className="w-4 h-4 text-sky-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500" />
                )
              }
            >
              {alocacoesDedicadas.every(a => selectedAlocacoes.includes(a.id))
                ? 'Desmarcar Dedicados'
                : 'Selecionar Todos os Dedicados'}
            </Button>
          )
        }
      >
        {alocacoesDedicadas.length === 0 ? (
          <div className="p-4 bg-slate-50 rounded-none border border-dashed border-slate-200 text-center text-xs text-slate-500">
            Nenhuma alocação dedicada ativa registrada para este agendamento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {alocacoesDedicadas.map((aloc, idx) => {
              const isIndisponivel = aloc.status_operacional === 'INDISPONIVEL'
              const motivo = motivos.find(m => m.id === aloc.motivo_indisponibilidade_id)
              const veiculoObj = getVeiculoObj(aloc.veiculo_id)
              const isVagaCoberta = isIndisponivel && alocacoesSpot.length > 0 && alocacoesSpot.length >= (idx + 1)
              const isReadOnly = agendamento.status === 'CONCLUIDO' || agendamento.status === 'CANCELADO'

              return (
                <div
                  key={aloc.id}
                  className={`p-4 rounded-none border flex flex-col justify-between transition-colors ${
                    isIndisponivel
                      ? 'bg-rose-50/60 border-rose-200'
                      : 'bg-slate-50/70 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedAlocacoes.includes(aloc.id)}
                        onChange={() => toggleSelectAlocacao(aloc.id)}
                        disabled={isReadOnly}
                        className="w-4 h-4 text-sky-600 border-slate-300 rounded-none focus:ring-sky-500 cursor-pointer disabled:opacity-50"
                        aria-label={`Selecionar Vaga Dedicada #${idx + 1}`}
                      />
                      <span className="text-xs font-bold text-slate-700">
                        VAGA DEDICADA #{idx + 1}
                      </span>
                    </div>
                    <StatusBadge status={aloc.status_operacional} />
                  </div>

                  <div className="space-y-1.5 text-xs mb-3">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{getMotoristaNome(aloc.motorista_id)}</span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-sky-700 flex-wrap">
                      <Truck className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>{getVeiculoInfo(aloc.veiculo_id)}</span>
                      <PerfilBadge perfil={veiculoObj?.especialidade} />
                    </div>

                    {isIndisponivel && (
                      <div className="p-3 bg-white border border-rose-200 rounded-none text-[11px] text-rose-800 space-y-2 mt-2 shadow-sm">
                        <div className="flex items-center gap-1.5 font-bold text-rose-700">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>RECURSO INDISPONÍVEL</span>
                        </div>
                        <p className="text-slate-600">
                          Motivo: <strong>{motivo?.nome || 'Motivo operacional registrado'}</strong>. A vaga permanece ocupada no contrato, mas necessita de cobertura SPOT para a rota.
                        </p>
                        {!isReadOnly && (
                          isVagaCoberta ? (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={true}
                                leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                                className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 cursor-not-allowed"
                              >
                                Vaga Coberta por SPOT
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={handleOpenAdicionarSpot}
                              leftIcon={<Plus className="w-3.5 h-3.5" />}
                              className="bg-rose-700 hover:bg-rose-800 border-rose-700 text-white"
                            >
                              + Cobrir Vaga com SPOT
                            </Button>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {!isReadOnly && (
                    <div className="pt-2.5 border-t border-slate-200 flex items-center justify-end gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenTrocarVeiculo(aloc.id)}
                        leftIcon={<Truck className="w-3.5 h-3.5 text-sky-600" />}
                        title="Substituir provisoriamente o veículo deste dedicado mantendo o contrato"
                      >
                        Trocar Veículo
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAlterarStatus(aloc.id, aloc.status_operacional)}
                        leftIcon={<Activity className="w-3.5 h-3.5 text-slate-600" />}
                      >
                        Alterar Status
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Seção 2: Alocações SPOT (Item 4: Selecionar Todos os SPOT) */}
      <Card
        title="Alocações SPOT (Recursos Adicionais)"
        subtitle="Inclusão e substituição de recursos SPOT complementares"
        className="bg-white border-slate-200 shadow-sm"
        action={
          agendamento.status !== 'CONCLUIDO' && agendamento.status !== 'CANCELADO' && (
            <div className="flex items-center gap-2">
              {alocacoesSpot.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleSelectAllSpot}
                  leftIcon={
                    alocacoesSpot.every(s => selectedAlocacoes.includes(s.id)) ? (
                      <CheckSquare className="w-4 h-4 text-sky-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500" />
                    )
                  }
                >
                  {alocacoesSpot.every(s => selectedAlocacoes.includes(s.id))
                    ? 'Desmarcar SPOT'
                    : 'Selecionar Todos os SPOT'}
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenAdicionarSpot}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Adicionar SPOT
              </Button>
            </div>
          )
        }
      >
        {alocacoesSpot.length === 0 ? (
          <div className="p-4 bg-slate-50 rounded-none border border-dashed border-slate-200 text-center text-xs text-slate-500">
            Nenhum recurso SPOT adicionado a esta programação ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {alocacoesSpot.map(spot => {
              const isReadOnly = agendamento.status === 'CONCLUIDO' || agendamento.status === 'CANCELADO'
              return (
                <div
                  key={spot.id}
                  className="p-4 bg-slate-50/80 border border-slate-200 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedAlocacoes.includes(spot.id)}
                        onChange={() => toggleSelectAlocacao(spot.id)}
                        disabled={isReadOnly}
                        className="w-4 h-4 text-sky-600 border-slate-300 rounded-none focus:ring-sky-500 cursor-pointer disabled:opacity-50"
                        aria-label="Selecionar Vaga SPOT"
                      />
                      <StatusBadge status="SPOT" showIcon={false} size="sm" />
                      <span className="font-bold text-slate-900 text-sm">
                        {getMotoristaNome(spot.motorista_id)}
                      </span>
                    </div>
                    <div className="font-mono text-sky-700 flex items-center gap-2 flex-wrap">
                      <span>{getVeiculoInfo(spot.veiculo_id)}</span>
                      <PerfilBadge perfil={getVeiculoObj(spot.veiculo_id)?.especialidade} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={spot.status_operacional} />
                    {!isReadOnly && (
                      <>
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
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                        >
                          Remover
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Barra de Ação Flutuante Inferior (Item 4) */}
      {selectedAlocacoes.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white shadow-2xl border border-slate-700 px-5 py-3 rounded-none flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <CheckSquare className="w-4 h-4 text-sky-400" />
            <span>
              {selectedAlocacoes.length} de {agendamento.alocacoes.length} vaga(s) selecionada(s)
            </span>
          </div>
          <div className="h-4 w-[1px] bg-slate-700" />
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setLoteFormError(null)
                setDrawerLoteOpen(true)
              }}
              leftIcon={<Layers className="w-4 h-4" />}
            >
              Alterar Status em Lote ({selectedAlocacoes.length})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedAlocacoes([])}
              className="text-slate-300 hover:text-white hover:bg-slate-800"
            >
              Desmarcar Todas
            </Button>
          </div>
        </div>
      )}

      {/* Seção 3: Histórico de Alterações */}
      <Card
        title="Histórico de Alterações da Programação"
        subtitle="Trilha decrescente de modificações com indicação de versão e resolução de motoristas e veículos"
        className="bg-white border-slate-200 shadow-sm"
      >
        {historicoOrdenado.length === 0 ? (
          <div className="p-4 bg-slate-50 rounded-none border border-slate-200 text-center text-xs text-slate-500">
            Nenhum evento registrado no histórico deste agendamento.
          </div>
        ) : (
          <div className="space-y-3">
            {historicoOrdenado.map((h) => {
              const isNovaVersao = h.tipo_alteracao === 'NOVA_VERSAO'
              const matchVersao = h.descricao.match(/v(\d+)/i)
              const versaoOficial = isNovaVersao && matchVersao ? `v${matchVersao[1]}` : null

              return (
                <div
                  key={h.id}
                  className={`p-3.5 border rounded-none flex items-start gap-3 text-xs ${
                    isNovaVersao
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : 'bg-slate-50/90 border-slate-200'
                  }`}
                >
                  <History className={`w-4 h-4 shrink-0 mt-0.5 ${isNovaVersao ? 'text-emerald-700' : 'text-sky-600'}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 uppercase tracking-wider">{h.tipo_alteracao}</span>
                        {versaoOficial && (
                          <span
                            className={`px-1.5 py-0.5 border text-[10px] font-mono font-bold ${
                              isNovaVersao
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                            title="Versão Oficial Salva"
                          >
                            {versaoOficial}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-slate-500 text-[11px]">{formatToBahia(h.criado_em)}</span>
                    </div>
                    <p className="text-slate-700 text-xs leading-relaxed">{formatarDescricaoHistorico(h.descricao)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Drawer Adicionar / Substituir SPOT (Item 1: Ordem alfabética) */}
      <Drawer
        isOpen={drawerSpotOpen}
        onClose={() => setDrawerSpotOpen(false)}
        title={targetAlocacaoId ? 'Substituir Alocação SPOT' : 'Adicionar Recurso SPOT'}
        subtitle="Selecione o motorista e veículo para alocação SPOT"
      >
        <form onSubmit={handleSalvarSpot} className="space-y-4">
          {spotFormError && <Alert type="error">{spotFormError}</Alert>}

          <Select
            label="Motorista SPOT (Ordem Alfabética A-Z)"
            value={motoristaSpotId}
            onChange={e => handleSelectMotoristaSpot(e.target.value)}
            placeholder="Selecione o motorista..."
            options={motoristasSpotElegiveis.map(m => ({ value: m.id, label: m.nome }))}
            required
          />

          <Select
            label="Veículo SPOT (Ordem Alfabética A-Z)"
            value={veiculoSpotId}
            onChange={e => handleSelectVeiculoSpot(e.target.value)}
            placeholder="Selecione o veículo..."
            options={veiculosSpotElegiveis.map(v => ({
              value: v.id,
              label: `${v.tipo_veiculo}${v.identificacao && v.identificacao !== v.placa ? ` - ${v.identificacao}` : ''} [${v.placa}] (${v.especialidade})`,
            }))}
            required
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
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
            onChange={e => setNovoStatusForm(e.target.value as StatusOperacional)}
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

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-none text-xs text-slate-700">
            <strong>Trilha de Auditoria:</strong> Toda transição gera um evento operacional imutável com timestamp em <code>America/Bahia</code>. A vaga permanece no agendamento para auditoria.
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setDrawerStatusOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="primary" size="sm" isLoading={submittingStatus} type="submit">
              Confirmar Alteração
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Drawer de Trocar Veículo Dedicado Provisoriamente (Item 1: Ordem alfabética) */}
      <Drawer
        isOpen={drawerTrocaVeiculoOpen}
        onClose={() => setDrawerTrocaVeiculoOpen(false)}
        title="Trocar Veículo Dedicado Provisoriamente"
        subtitle="Substituição temporária do veículo mantendo o vínculo e categoria DEDICADO"
      >
        <form onSubmit={handleSalvarTrocaVeiculo} className="space-y-4">
          {trocaFormError && <Alert type="error">{trocaFormError}</Alert>}

          <Select
            label="Novo Veículo Substituto (Ordem Alfabética A-Z)"
            value={novoVeiculoIdForm}
            onChange={e => setNovoVeiculoIdForm(e.target.value)}
            placeholder="Selecione o veículo..."
            options={veiculosSpotElegiveis.map(v => ({
              value: v.id,
              label: `${v.tipo_veiculo}${v.identificacao && v.identificacao !== v.placa ? ` - ${v.identificacao}` : ''} [${v.placa}] (${v.especialidade})`,
            }))}
            required
          />

          <Input
            label="Motivo da Troca Provisória (Opcional)"
            value={motivoTrocaForm}
            onChange={e => setMotivoTrocaForm(e.target.value)}
            placeholder="Ex: Manutenção preventiva, quebra mecânica, vistoria..."
          />

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-none text-xs text-slate-700">
            <strong>Regra Q5:</strong> A troca é registrada na trilha de auditoria com versionamento consecutivo e preserva a categoria <code>DEDICADO</code> no agendamento.
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setDrawerTrocaVeiculoOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="primary" size="sm" isLoading={submittingTroca} type="submit">
              Confirmar Troca de Veículo
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Drawer Alterar Status em Lote */}
      <Drawer
        isOpen={drawerLoteOpen}
        onClose={() => setDrawerLoteOpen(false)}
        title={`Alterar Status em Lote (${selectedAlocacoes.length} vagas)`}
        subtitle="Atualize a situação operacional de múltiplos recursos selecionados simultaneamente"
      >
        <form onSubmit={handleSalvarStatusLote} className="space-y-4">
          {loteFormError && <Alert type="error">{loteFormError}</Alert>}

          <Select
            label="Novo Status Operacional para os Selecionados"
            value={loteNovoStatus}
            onChange={e => setLoteNovoStatus(e.target.value as StatusOperacional)}
            options={[
              { value: 'PROGRAMADO', label: 'PROGRAMADO (Na Escala)' },
              { value: 'EM_ROTA', label: 'EM ROTA (Em Viagem)' },
              { value: 'DISPONIVEL', label: 'DISPONÍVEL (Livre)' },
              { value: 'INDISPONIVEL', label: 'INDISPONÍVEL (Registrar Motivo)' },
            ]}
            required
          />

          {loteNovoStatus === 'INDISPONIVEL' && (
            <Select
              label="Motivo de Indisponibilidade"
              value={loteMotivoId}
              onChange={e => setLoteMotivoId(e.target.value)}
              placeholder="Selecione o motivo..."
              options={motivos.map(m => ({ value: m.id, label: m.nome }))}
              required
            />
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-none text-xs text-slate-700">
            <strong>Ação Coletiva:</strong> O status das {selectedAlocacoes.length} alocações selecionadas será atualizado de forma atômica no backend com registro na trilha de auditoria.
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setDrawerLoteOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="primary" size="sm" isLoading={submittingLote} type="submit">
              Aplicar a Todos os Selecionados
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Modal Bloqueante de Saída com Alterações Não Salvas (Item 3) */}
      <Modal
        isOpen={!!pendingNavigation}
        onClose={clearPendingNavigation}
        title="Alterações não salvas na programação"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-none text-xs text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Atenção: A escala possui alterações na composição de recursos!</p>
              <p className="text-amber-800 leading-relaxed">
                Você adicionou, substituiu ou removeu motoristas/veículos neste agendamento. Se sair sem salvar, essas alterações serão descartadas para manter a programação oficial consistente.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-700">
            O que você deseja fazer antes de sair desta tela?
          </p>

          <div className="flex flex-col gap-2 pt-2 border-t border-slate-200">
            <Button
              variant="primary"
              onClick={handleSalvarESair}
              isLoading={salvandoVersao}
              leftIcon={<Save className="w-4 h-4" />}
              className="w-full justify-center"
            >
              Salvar Agendamento e Prosseguir
            </Button>

            <Button
              variant="danger"
              onClick={handleDesfazerESair}
              isLoading={revertendoAlteracoes}
              leftIcon={<RotateCcw className="w-4 h-4" />}
              className="w-full justify-center"
            >
              Desfazer Alterações e Sair
            </Button>

            <Button
              variant="outline"
              onClick={clearPendingNavigation}
              className="w-full justify-center"
            >
              Permanecer na Tela
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Conclusão de Agendamento (Item 2) */}
      <ConfirmDialog
        isOpen={concluirModalOpen}
        onClose={() => setConcluirModalOpen(false)}
        onConfirm={handleConfirmarConclusao}
        title="Concluir Agendamento"
        message="Tem certeza que deseja concluir este agendamento? A programação será encerrada e os motoristas serão liberados para novas viagens na Torre, mantendo o histórico e os registros desta programação inalterados para auditoria."
        confirmText="Sim, Concluir"
        cancelText="Voltar"
        variant="primary"
        isLoading={concluindo}
      />

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

      {/* Modal de Confirmação de Remoção SPOT */}
      <ConfirmDialog
        isOpen={!!spotParaRemoverId}
        onClose={() => setSpotParaRemoverId(null)}
        onConfirm={handleConfirmarRemoverSpot}
        title="Remover Alocação SPOT"
        message="Tem certeza que deseja remover esta alocação SPOT? O recurso retornará para o banco de disponíveis."
        confirmText="Sim, Remover"
        cancelText="Voltar"
        variant="danger"
        isLoading={removendoSpot}
      />
    </div>
  )
}
