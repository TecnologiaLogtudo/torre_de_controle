import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAgendamentoDetalhes } from '../hooks/useAgendamentoDetalhes'
import { StatusOperacional } from '@/types/agendamentos'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusBadge, PerfilBadge } from '@/components/ui/StatusBadge'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
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
  } = useAgendamentoDetalhes(id)

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

  const alocacoesDedicadas = agendamento.alocacoes.filter(a => a.categoria === 'DEDICADO')
  const alocacoesSpot = agendamento.alocacoes.filter(a => a.categoria === 'SPOT')
  const totalIndisponiveisDedicados = alocacoesDedicadas.filter(a => a.status_operacional === 'INDISPONIVEL').length

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
          badge={
            <div className="flex items-center gap-2">
              <span
                className="px-2 py-0.5 rounded-none text-xs font-mono font-bold bg-slate-100 text-sky-700 border border-slate-300"
                title="Versão do Agendamento (incrementada a cada alteração)"
              >
                v{agendamento.versao || 1}
              </span>
              <StatusBadge status={agendamento.status} />
            </div>
          }
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
              {formatToBahia(agendamento.data, { hour: undefined, minute: undefined, second: undefined })}
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

      {/* Seção 1: Composição Contratual de Dedicados por Vaga */}
      <Card
        title="Composição Contratual de Dedicados (Preenchimento por Vaga)"
        subtitle="Vagas da empresa atreladas aos recursos dedicados associados"
        className="bg-white border-slate-200 shadow-sm"
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
                    <span className="text-xs font-bold text-slate-700">
                      VAGA DEDICADA #{idx + 1}
                    </span>
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
                        {isVagaCoberta ? (
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
                        )}
                      </div>
                    )}
                  </div>

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
        className="bg-white border-slate-200 shadow-sm"
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
          <div className="p-4 bg-slate-50 rounded-none border border-dashed border-slate-200 text-center text-xs text-slate-500">
            Nenhum recurso SPOT adicionado a esta programação ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {alocacoesSpot.map(spot => (
              <div
                key={spot.id}
                className="p-4 bg-slate-50/80 border border-slate-200 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
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
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

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
            {historicoOrdenado.map((h, idx) => (
              <div key={h.id} className="p-3.5 bg-slate-50/90 border border-slate-200 rounded-none flex items-start gap-3 text-xs">
                <History className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 uppercase tracking-wider">{h.tipo_alteracao}</span>
                      <span className="px-1.5 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-mono font-bold">
                        v{historicoOrdenado.length - idx}
                      </span>
                    </div>
                    <span className="font-mono text-slate-500 text-[11px]">{formatToBahia(h.criado_em)}</span>
                  </div>
                  <p className="text-slate-700 text-xs leading-relaxed">{formatarDescricaoHistorico(h.descricao)}</p>
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
            onChange={e => handleSelectMotoristaSpot(e.target.value)}
            placeholder="Selecione o motorista..."
            options={motoristasSpotElegiveis.map(m => ({ value: m.id, label: m.nome }))}
            required
          />

          <Select
            label="Veículo SPOT (Apenas Não-Dedicados e Livres)"
            value={veiculoSpotId}
            onChange={e => handleSelectVeiculoSpot(e.target.value)}
            placeholder="Selecione o veículo..."
            options={veiculosSpotElegiveis.map(v => ({
              value: v.id,
              label: `${v.tipo_veiculo} - ${v.identificacao} [${v.placa}] (${v.especialidade})`,
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
            <strong>Trilha de Auditoria:</strong> Toda transição gera um evento operacional imutável com timestamp em <code>America/Bahia</code>.
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

      {/* Drawer de Trocar Veículo Dedicado Provisoriamente */}
      <Drawer
        isOpen={drawerTrocaVeiculoOpen}
        onClose={() => setDrawerTrocaVeiculoOpen(false)}
        title="Trocar Veículo Dedicado Provisoriamente"
        subtitle="Substituição temporária do veículo mantendo o vínculo e categoria DEDICADO"
      >
        <form onSubmit={handleSalvarTrocaVeiculo} className="space-y-4">
          {trocaFormError && <Alert type="error">{trocaFormError}</Alert>}

          <Select
            label="Novo Veículo Substituto"
            value={novoVeiculoIdForm}
            onChange={e => setNovoVeiculoIdForm(e.target.value)}
            placeholder="Selecione o veículo..."
            options={veiculosSpotElegiveis.map(v => ({
              value: v.id,
              label: `${v.tipo_veiculo} - ${v.placa} (${v.especialidade})`,
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
