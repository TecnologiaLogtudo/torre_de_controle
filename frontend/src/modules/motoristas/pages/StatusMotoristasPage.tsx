import React, { useEffect, useState, useCallback } from 'react'
import { torreService } from '@/services/torre/torreService'
import { empresasService } from '@/services/empresas/empresasService'
import { motivosService } from '@/services/motivos/motivosService'
import { MotoristasStatus, MotoristaStatus } from '@/types/torre'
import { Empresa } from '@/types/empresas'
import { MotivoIndisponibilidade } from '@/types/motivos'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/SearchInput'
import { FilterBar } from '@/components/ui/FilterBar'
import { Select } from '@/components/ui/Select'
import { Table, TableHeader, TableBody, TableRow, TableHeadCell, TableCell } from '@/components/ui/Table'
import { StatusBadge, PerfilBadge } from '@/components/ui/StatusBadge'
import { Drawer } from '@/components/ui/Drawer'
import { Alert } from '@/components/ui/Alert'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/feedback/Toaster'
import { getHojeBahiaIso } from '@/utils/date'
import { getErrorMessage } from '@/services/api/errors'
import { RefreshCw, UserCheck, Edit, AlertTriangle, CheckSquare, Square, Users, CheckCircle2 } from 'lucide-react'

const SEM_ALOCACAO_LABEL = 'Sem Alocação'

const STATUS_OPTIONS: { value: MotoristaStatus['status_operacional']; label: string; desc: string }[] = [
  { value: 'DISPONIVEL', label: 'Disponível', desc: 'Motorista apto e pronto para atender operações.' },
  { value: 'PROGRAMADO', label: 'Programado', desc: 'Escalado em agendamento para execução.' },
  { value: 'EM_ROTA', label: 'Em Rota', desc: 'Em atendimento operacional/viagem em trânsito.' },
  { value: 'INDISPONIVEL', label: 'Indisponível', desc: 'Impossibilitado de operar (necessário motivo).' },
  { value: 'SEM_ALOCACAO', label: 'Sem Alocação', desc: 'Recurso livre sem escala operacional na data.' },
]

interface ResumoCardProps {
  label: string
  valor: number
  cor: string
  borderAccent: string
  ativo: boolean
  onClick?: () => void
}

const ResumoCard: React.FC<ResumoCardProps> = ({
  label,
  valor,
  cor,
  borderAccent,
  ativo,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full text-left rounded-none border p-3 border-t-2 transition-colors cursor-pointer shadow-sm ${borderAccent} ${
      ativo
        ? 'bg-slate-100 border-slate-300'
        : 'bg-white border-slate-200 hover:bg-slate-50'
    }`}
  >
    <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">{label}</div>
    <div className={`mt-1 font-mono text-2xl font-bold tracking-tight ${cor}`}>{valor}</div>
  </button>
)

export const StatusMotoristasPage: React.FC = () => {
  const hojeStr = getHojeBahiaIso()
  const [dataFiltro, setDataFiltro] = useState(hojeStr)
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS')
  const [searchNome, setSearchNome] = useState('')
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [motivos, setMotivos] = useState<MotivoIndisponibilidade[]>([])
  const [statusData, setStatusData] = useState<MotoristasStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Drawer de Alteração de Status Individual
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedMotorista, setSelectedMotorista] = useState<MotoristaStatus | null>(null)
  const [novoStatusForm, setNovoStatusForm] = useState<MotoristaStatus['status_operacional']>('DISPONIVEL')
  const [motivoIdForm, setMotivoIdForm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Estados para Seleção e Ação em Massa / Lote
  const [selectedMotoristas, setSelectedMotoristas] = useState<string[]>([])
  const [drawerLoteOpen, setDrawerLoteOpen] = useState(false)
  const [loteNovoStatus, setLoteNovoStatus] = useState<MotoristaStatus['status_operacional']>('DISPONIVEL')
  const [loteMotivoId, setLoteMotivoId] = useState('')
  const [submittingLote, setSubmittingLote] = useState(false)
  const [loteFormError, setLoteFormError] = useState<string | null>(null)

  const carregarDados = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [status, empList, motList] = await Promise.all([
        torreService.obterStatusMotoristas({
          data: dataFiltro,
          ...(filtroEmpresa ? { empresa_id: filtroEmpresa } : {}),
        }),
        empresasService.listar().catch(() => [] as Empresa[]),
        motivosService.listarMotivos(true).catch(() => [] as MotivoIndisponibilidade[]),
      ])
      setStatusData(status)
      setEmpresas(empList)
      setMotivos(motList)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erro ao carregar status dos motoristas.'))
    } finally {
      setLoading(false)
    }
  }, [dataFiltro, filtroEmpresa])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const handleOpenAlterarStatus = (m: MotoristaStatus) => {
    setSelectedMotorista(m)
    const isSpot = m.categoria === 'SPOT' || !m.empresa_id
    if (isSpot && (m.status_operacional === 'PROGRAMADO' || m.status_operacional === 'EM_ROTA')) {
      setNovoStatusForm('DISPONIVEL')
    } else {
      setNovoStatusForm(m.status_operacional)
    }
    const motExistente = motivos.find(mot => mot.nome === m.motivo_indisponibilidade)
    setMotivoIdForm(motExistente ? motExistente.id : (motivos.length > 0 ? motivos[0].id : ''))
    setFormError(null)
    setDrawerOpen(true)
  }

  const handleSalvarStatus = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMotorista) return
    setFormError(null)

    const isSpot = selectedMotorista.categoria === 'SPOT' || !selectedMotorista.empresa_id
    if (isSpot && (novoStatusForm === 'PROGRAMADO' || novoStatusForm === 'EM_ROTA')) {
      setFormError(
        'Motoristas da categoria SPOT não possuem vínculo com empresa e não podem ser alterados para Programado ou Em Rota diretamente. Realize a escala através da tela de Agendamentos.'
      )
      return
    }

    if (novoStatusForm === 'INDISPONIVEL' && !motivoIdForm) {
      setFormError('Selecione o motivo de indisponibilidade obrigatório.')
      return
    }

    setSubmitting(true)
    try {
      await torreService.alterarStatusMotorista(selectedMotorista.motorista_id, {
        data: dataFiltro,
        novo_status: novoStatusForm,
        motivo_indisponibilidade_id: novoStatusForm === 'INDISPONIVEL' ? motivoIdForm : undefined,
        origem_alteracao: 'status_motoristas',
      })
      toast.success(
        `Status de "${selectedMotorista.motorista_nome}" atualizado para ${novoStatusForm} com sucesso!`
      )
      setDrawerOpen(false)
      await carregarDados()
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Erro ao alterar status operacional do motorista.')
      setFormError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleSelectMotorista = (motoristaId: string) => {
    setSelectedMotoristas(prev =>
      prev.includes(motoristaId) ? prev.filter(id => id !== motoristaId) : [...prev, motoristaId]
    )
  }

  const handleToggleSelectAll = () => {
    const todosFiltradosIds = motoristasFiltrados.map(m => m.motorista_id)
    if (selectedMotoristas.length === todosFiltradosIds.length && todosFiltradosIds.length > 0) {
      setSelectedMotoristas([])
    } else {
      setSelectedMotoristas(todosFiltradosIds)
    }
  }

  const handleSelectTodosSemAlocacao = () => {
    const semAlocIds = (statusData?.motoristas || [])
      .filter(m => m.status_operacional === 'SEM_ALOCACAO')
      .map(m => m.motorista_id)
    setSelectedMotoristas(semAlocIds)
  }

  const handleSalvarStatusLote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedMotoristas.length === 0) return
    setLoteFormError(null)

    if (loteNovoStatus === 'INDISPONIVEL' && !loteMotivoId) {
      setLoteFormError('Selecione o motivo de indisponibilidade obrigatório.')
      return
    }

    setSubmittingLote(true)
    try {
      await torreService.atualizarStatusLote({
        motorista_ids: selectedMotoristas,
        data: dataFiltro,
        novo_status: loteNovoStatus,
        motivo_indisponibilidade_id: loteNovoStatus === 'INDISPONIVEL' ? loteMotivoId : undefined,
        origem_alteracao: 'status_motoristas_massa',
      })
      toast.success(`Status de ${selectedMotoristas.length} motorista(s) atualizado para ${loteNovoStatus}!`)
      setSelectedMotoristas([])
      setDrawerLoteOpen(false)
      await carregarDados()
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Erro ao atualizar status dos motoristas em massa.')
      setLoteFormError(msg)
      toast.error(msg)
    } finally {
      setSubmittingLote(false)
    }
  }

  const handleTornarSemAlocacaoDisponiveis = async () => {
    const semAlocIds = (statusData?.motoristas || [])
      .filter(m => m.status_operacional === 'SEM_ALOCACAO')
      .map(m => m.motorista_id)

    if (semAlocIds.length === 0) {
      toast.info('Não há motoristas sem alocação nesta data.')
      return
    }

    setLoading(true)
    try {
      await torreService.atualizarStatusLote({
        motorista_ids: semAlocIds,
        data: dataFiltro,
        novo_status: 'DISPONIVEL',
        origem_alteracao: 'status_motoristas_tornar_disponiveis',
      })
      toast.success(`${semAlocIds.length} motorista(s) sem alocação alterado(s) para Disponível com sucesso!`)
      setSelectedMotoristas([])
      await carregarDados()
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erro ao atualizar motoristas sem alocação.'))
    } finally {
      setLoading(false)
    }
  }

  const statusOrdemPeso: Record<string, number> = {
    EM_ROTA: 1,
    PROGRAMADO: 2,
    DISPONIVEL: 3,
    INDISPONIVEL: 4,
    SEM_ALOCACAO: 5,
  }

  const motoristasFiltrados: MotoristaStatus[] = (statusData?.motoristas || [])
    .filter(m => {
      const matchNome = m.motorista_nome.toLowerCase().includes(searchNome.toLowerCase())
      if (!matchNome) return false
      if (filtroStatus !== 'TODOS' && m.status_operacional !== filtroStatus) return false
      return true
    })
    .sort((a, b) => {
      const pesoA = statusOrdemPeso[a.status_operacional] ?? 99
      const pesoB = statusOrdemPeso[b.status_operacional] ?? 99
      if (pesoA !== pesoB) return pesoA - pesoB
      return a.motorista_nome.localeCompare(b.motorista_nome)
    })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Status de Motoristas"
        subtitle="Visão consolidada do status operacional atual por motorista (fuso America/Bahia)"
        actions={
          <Button
            variant="outline"
            onClick={carregarDados}
            leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            Atualizar
          </Button>
        }
      />

      {error && <Alert type="error">{error}</Alert>}

      <FilterBar
        hasActiveFilters={!!(searchNome || filtroEmpresa || dataFiltro !== hojeStr || filtroStatus !== 'TODOS')}
        onClearFilters={() => {
          setDataFiltro(hojeStr)
          setFiltroEmpresa('')
          setFiltroStatus('TODOS')
          setSearchNome('')
        }}
      >
        <div className="flex flex-wrap items-center gap-3 w-full">
          <div className="w-40">
            <Input
              type="date"
              value={dataFiltro}
              onChange={e => setDataFiltro(e.target.value)}
              aria-label="Filtrar por data"
            />
          </div>

          <div className="w-56">
            <Select
              value={filtroEmpresa}
              onChange={e => setFiltroEmpresa(e.target.value)}
              placeholder="Empresa (Todas)"
              options={empresas.map(e => ({ value: e.id, label: e.nome }))}
            />
          </div>

          <div className="w-72">
            <SearchInput
              value={searchNome}
              onChange={e => setSearchNome(e.target.value)}
              onClear={() => setSearchNome('')}
              placeholder="Buscar por nome do motorista..."
            />
          </div>
        </div>
      </FilterBar>

      {/* Indicadores de consolidação do dia com seleção interativa */}
      {statusData && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <ResumoCard
            label="Total"
            valor={statusData.total}
            cor="text-slate-900"
            borderAccent="border-t-slate-500"
            ativo={filtroStatus === 'TODOS'}
            onClick={() => setFiltroStatus('TODOS')}
          />
          <ResumoCard
            label="Disponíveis"
            valor={statusData.disponiveis}
            cor="text-emerald-700"
            borderAccent="border-t-emerald-600"
            ativo={filtroStatus === 'DISPONIVEL'}
            onClick={() => setFiltroStatus(filtroStatus === 'DISPONIVEL' ? 'TODOS' : 'DISPONIVEL')}
          />
          <ResumoCard
            label="Programados"
            valor={statusData.programados}
            cor="text-sky-700"
            borderAccent="border-t-sky-600"
            ativo={filtroStatus === 'PROGRAMADO'}
            onClick={() => setFiltroStatus(filtroStatus === 'PROGRAMADO' ? 'TODOS' : 'PROGRAMADO')}
          />
          <ResumoCard
            label="Em Rota"
            valor={statusData.em_rota}
            cor="text-amber-700"
            borderAccent="border-t-amber-500"
            ativo={filtroStatus === 'EM_ROTA'}
            onClick={() => setFiltroStatus(filtroStatus === 'EM_ROTA' ? 'TODOS' : 'EM_ROTA')}
          />
          <ResumoCard
            label="Indisponíveis"
            valor={statusData.indisponiveis}
            cor="text-rose-700"
            borderAccent="border-t-rose-500"
            ativo={filtroStatus === 'INDISPONIVEL'}
            onClick={() => setFiltroStatus(filtroStatus === 'INDISPONIVEL' ? 'TODOS' : 'INDISPONIVEL')}
          />
          <ResumoCard
            label="Sem Alocação"
            valor={statusData.sem_alocacao}
            cor="text-slate-600"
            borderAccent="border-t-slate-400"
            ativo={filtroStatus === 'SEM_ALOCACAO'}
            onClick={() => setFiltroStatus(filtroStatus === 'SEM_ALOCACAO' ? 'TODOS' : 'SEM_ALOCACAO')}
          />
        </div>
      )}

      {/* Atalho Rápido para Motoristas Sem Alocação */}
      {statusData && statusData.sem_alocacao > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-amber-50 border border-amber-200 rounded-none text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Existem <strong>{statusData.sem_alocacao}</strong> motorista(s) com status <strong>Sem Alocação</strong> nesta data.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectTodosSemAlocacao}
            >
              Selecionar ({statusData.sem_alocacao})
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleTornarSemAlocacaoDisponiveis}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Tornar Todos Disponíveis
            </Button>
          </div>
        </div>
      )}

      {/* Barra de Ação em Massa */}
      {selectedMotoristas.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 p-2.5 border border-slate-300">
          <div className="flex items-center gap-2 text-xs">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleSelectAll}
              leftIcon={
                selectedMotoristas.length === motoristasFiltrados.length && motoristasFiltrados.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-sky-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500" />
                )
              }
            >
              {selectedMotoristas.length === motoristasFiltrados.length && motoristasFiltrados.length > 0
                ? 'Desmarcar Todos'
                : 'Selecionar Todos da Tela'}
            </Button>
            <span className="font-semibold text-slate-800">
              {selectedMotoristas.length} motorista(s) selecionado(s)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedMotoristas([])}
            >
              Limpar Seleção
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setLoteNovoStatus('DISPONIVEL')
                setLoteMotivoId(motivos.length > 0 ? motivos[0].id : '')
                setLoteFormError(null)
                setDrawerLoteOpen(true)
              }}
              leftIcon={<Users className="w-3.5 h-3.5" />}
            >
              Alterar Status em Massa ({selectedMotoristas.length})
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : motoristasFiltrados.length === 0 ? (
        <EmptyState
          icon={<UserCheck className="w-12 h-12 text-slate-400" />}
          title="Nenhum motorista encontrado"
          description="Ajuste os filtros de status, data, empresa ou pesquisa por nome."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeadCell compact className="w-8 text-center">
                <input
                  type="checkbox"
                  checked={motoristasFiltrados.length > 0 && selectedMotoristas.length === motoristasFiltrados.length}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 text-sky-600 border-slate-300 rounded-none focus:ring-sky-500 cursor-pointer"
                  aria-label="Selecionar todos os motoristas"
                />
              </TableHeadCell>
              <TableHeadCell compact>Motorista</TableHeadCell>
              <TableHeadCell compact>Empresa</TableHeadCell>
              <TableHeadCell compact>Veículo / Placa</TableHeadCell>
              <TableHeadCell compact>Perfil</TableHeadCell>
              <TableHeadCell compact>Categoria</TableHeadCell>
              <TableHeadCell compact>Status Operacional</TableHeadCell>
              <TableHeadCell compact>Motivo Indisponibilidade</TableHeadCell>
              <TableHeadCell compact className="text-right">Ações</TableHeadCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {motoristasFiltrados.map(m => (
              <TableRow key={m.motorista_id}>
                <TableCell compact className="w-8 text-center">
                  <input
                    type="checkbox"
                    checked={selectedMotoristas.includes(m.motorista_id)}
                    onChange={() => toggleSelectMotorista(m.motorista_id)}
                    className="w-4 h-4 text-sky-600 border-slate-300 rounded-none focus:ring-sky-500 cursor-pointer"
                    aria-label={`Selecionar motorista ${m.motorista_nome}`}
                  />
                </TableCell>
                <TableCell compact className="font-semibold text-slate-900">{m.motorista_nome}</TableCell>
                <TableCell compact className="text-slate-600 font-mono text-xs">{m.empresa_nome || '-'}</TableCell>
                <TableCell compact>
                  {m.veiculo_placa ? (
                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      {m.veiculo_tipo && <span className="text-slate-600 font-sans">{m.veiculo_tipo}</span>}
                      <span className="font-bold text-sky-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-none">
                        [{m.veiculo_placa}]
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 font-mono">-</span>
                  )}
                </TableCell>
                <TableCell compact>
                  <PerfilBadge perfil={m.veiculo_especialidade} />
                </TableCell>
                <TableCell compact className="text-slate-600 font-mono text-xs">{m.categoria || '-'}</TableCell>
                <TableCell compact>
                  <button
                    type="button"
                    onClick={() => handleOpenAlterarStatus(m)}
                    className="cursor-pointer inline-flex items-center group text-left"
                    title="Clique para alterar status operacional"
                  >
                    {m.status_operacional === 'SEM_ALOCACAO' ? (
                      <span className="inline-flex items-center rounded-none border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-200 transition-colors">
                        {SEM_ALOCACAO_LABEL}
                      </span>
                    ) : (
                      <StatusBadge status={m.status_operacional} size="sm" />
                    )}
                  </button>
                </TableCell>
                <TableCell compact className="text-slate-600 text-xs font-sans">
                  {m.motivo_indisponibilidade || '-'}
                </TableCell>
                <TableCell compact className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenAlterarStatus(m)}
                    leftIcon={<Edit className="w-3.5 h-3.5" />}
                    title="Alterar status operacional deste motorista"
                  >
                    Alterar Status
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Drawer de Alteração de Status Operacional */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Alterar Status Operacional"
        subtitle={
          selectedMotorista
            ? `Motorista: ${selectedMotorista.motorista_nome} (Data: ${dataFiltro})`
            : 'Defina o novo status operacional'
        }
      >
        <form onSubmit={handleSalvarStatus} className="space-y-4">
          {formError && <Alert type="error">{formError}</Alert>}

          {selectedMotorista && (
            (() => {
              const isSpot = selectedMotorista.categoria === 'SPOT' || !selectedMotorista.empresa_id
              return (
                <>
                  <div className="bg-slate-50 border border-slate-200 p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Status Atual:</span>
                      {selectedMotorista.status_operacional === 'SEM_ALOCACAO' ? (
                        <span className="inline-flex items-center border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                          {SEM_ALOCACAO_LABEL}
                        </span>
                      ) : (
                        <StatusBadge status={selectedMotorista.status_operacional} />
                      )}
                    </div>
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="text-slate-500">Categoria:</span>
                      <span className="font-mono font-bold text-slate-800">{selectedMotorista.categoria || 'SPOT'}</span>
                    </div>
                    {selectedMotorista.veiculo_placa && (
                      <div className="flex justify-between items-center text-slate-700">
                        <span className="text-slate-500">Veículo:</span>
                        <span className="font-mono font-bold text-sky-700">
                          [{selectedMotorista.veiculo_placa}] {selectedMotorista.veiculo_tipo || ''}
                        </span>
                      </div>
                    )}
                    {selectedMotorista.empresa_nome && (
                      <div className="flex justify-between items-center text-slate-700">
                        <span className="text-slate-500">Empresa:</span>
                        <span>{selectedMotorista.empresa_nome}</span>
                      </div>
                    )}
                  </div>

                  {isSpot && (
                    <div className="bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800 space-y-1">
                      <div className="font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        Motorista Spot (Sem Vínculo com Empresa)
                      </div>
                      <p className="text-[11px] text-amber-700">
                        Motoristas SPOT não podem ser marcados como <strong>Programado</strong> ou <strong>Em Rota</strong> diretamente nesta tela. Para escalá-los em uma rota, realize o agendamento através da tela de <strong>Agendamentos</strong> vinculando-os à empresa contratante.
                      </p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Novo Status Operacional:
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {STATUS_OPTIONS.map(opt => {
                        const isBlockedForSpot = isSpot && (opt.value === 'PROGRAMADO' || opt.value === 'EM_ROTA')
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={isBlockedForSpot}
                            onClick={() => !isBlockedForSpot && setNovoStatusForm(opt.value)}
                            className={`p-2.5 text-left border transition-colors ${
                              isBlockedForSpot
                                ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                                : novoStatusForm === opt.value
                                ? 'bg-sky-50 border-sky-600 ring-1 ring-sky-600'
                                : 'bg-white border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold ${isBlockedForSpot ? 'text-slate-400' : 'text-slate-800'}`}>
                                {opt.label}
                              </span>
                              {isBlockedForSpot ? (
                                <span className="text-[10px] font-mono text-amber-700 font-bold bg-amber-50 border border-amber-200 px-1 py-0.5">
                                  REQUER AGENDAMENTO
                                </span>
                              ) : novoStatusForm === opt.value ? (
                                <span className="text-[10px] font-mono text-sky-700 font-bold">SELECIONADO</span>
                              ) : null}
                            </div>
                            <p className={`text-[11px] mt-0.5 ${isBlockedForSpot ? 'text-slate-400' : 'text-slate-500'}`}>
                              {isBlockedForSpot ? 'Bloqueado para SPOT: vincule a uma empresa via Agendamentos.' : opt.desc}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )
            })()
          )}

          {novoStatusForm === 'INDISPONIVEL' && (
            <Select
              label="Motivo de Indisponibilidade"
              value={motivoIdForm}
              onChange={e => setMotivoIdForm(e.target.value)}
              placeholder="Selecione o motivo..."
              options={motivos.map(m => ({ value: m.id, label: m.nome }))}
              required
            />
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDrawerOpen(false)}
              type="button"
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={submitting}
              type="submit"
            >
              Confirmar Alteração
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Drawer Alterar Status em Massa */}
      <Drawer
        isOpen={drawerLoteOpen}
        onClose={() => setDrawerLoteOpen(false)}
        title={`Alterar Status em Massa (${selectedMotoristas.length} selecionados)`}
        subtitle={`Defina o novo status operacional para os motoristas selecionados (Data: ${dataFiltro})`}
      >
        <form onSubmit={handleSalvarStatusLote} className="space-y-4">
          {loteFormError && <Alert type="error">{loteFormError}</Alert>}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-none text-xs text-slate-700">
            <strong>Recursos Selecionados:</strong> {selectedMotoristas.length} motorista(s) serão atualizados simultaneamente com registro individual na trilha de auditoria operacional.
          </div>

          <Select
            label="Novo Status Operacional em Massa"
            value={loteNovoStatus}
            onChange={e => setLoteNovoStatus(e.target.value as MotoristaStatus['status_operacional'])}
            options={[
              { value: 'DISPONIVEL', label: 'Disponível (Pronto para operar)' },
              { value: 'INDISPONIVEL', label: 'Indisponível (Registrar Motivo)' },
              { value: 'SEM_ALOCACAO', label: 'Sem Alocação (Remover alocação atual)' },
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

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDrawerLoteOpen(false)}
              type="button"
              disabled={submittingLote}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={submittingLote}
              type="submit"
            >
              Aplicar a Todos ({selectedMotoristas.length})
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  )
}

