import React from 'react'
import { DetalhamentoOperacional, FiltrosDetalhamentoTorre } from '@/types/torre'
import { Empresa } from '@/types/empresas'
import { StatusOperacional } from '@/types/agendamentos'
import { MotivoIndisponibilidade } from '@/types/motivos'
import { Card } from '@/components/ui/Card'
import { FilterBar } from '@/components/ui/FilterBar'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Alert } from '@/components/ui/Alert'
import { Table, TableHeader, TableBody, TableRow, TableHeadCell, TableCell } from '@/components/ui/Table'
import { StatusBadge, PerfilBadge } from '@/components/ui/StatusBadge'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { torreService } from '@/services/torre/torreService'
import { motivosService } from '@/services/motivos/motivosService'
import { toast } from '@/components/feedback/Toaster'
import { getErrorMessage } from '@/services/api/errors'
import { Truck, UserCheck, Layers, CheckSquare, Square, Edit3 } from 'lucide-react'

export interface DetalhamentoTorreProps {
  detalhamento: DetalhamentoOperacional[]
  empresas: Empresa[]
  filtros: FiltrosDetalhamentoTorre
  onFiltrosChange: (novosFiltros: FiltrosDetalhamentoTorre) => void
  onClearFiltros: () => void
  isLoading: boolean
  onReload?: () => void
}

export const DetalhamentoTorre: React.FC<DetalhamentoTorreProps> = ({
  detalhamento,
  empresas,
  filtros,
  onFiltrosChange,
  onClearFiltros,
  isLoading,
  onReload,
}) => {
  const [motoristaInput, setMotoristaInput] = React.useState(filtros.motorista_nome || '')
  const [placaInput, setPlacaInput] = React.useState(filtros.placa || '')

  // Estados para Seleção e Ação em Lote
  const [selectedAlocacoes, setSelectedAlocacoes] = React.useState<string[]>([])
  const [drawerLoteOpen, setDrawerLoteOpen] = React.useState(false)
  const [loteNovoStatus, setLoteNovoStatus] = React.useState<StatusOperacional>('PROGRAMADO')
  const [loteMotivoId, setLoteMotivoId] = React.useState<string>('')
  const [submittingLote, setSubmittingLote] = React.useState(false)
  const [loteFormError, setLoteFormError] = React.useState<string | null>(null)
  const [motivos, setMotivos] = React.useState<MotivoIndisponibilidade[]>([])

  React.useEffect(() => {
    motivosService.listarMotivos(true).then(setMotivos).catch(() => {})
  }, [])

  // Regra de exibição da Torre: Mostra dedicados (todos os status) e apenas spots agendados ou em rota
  // Ordem prioritária de exibição: 1- Em rota, 2- Programados, 3- Disponíveis, 4- Indisponíveis
  const statusOrdemPeso: Record<string, number> = {
    EM_ROTA: 1,
    PROGRAMADO: 2,
    DISPONIVEL: 3,
    INDISPONIVEL: 4,
    SEM_ALOCACAO: 5,
  }

  const detalhamentoVisivel = React.useMemo(() => {
    const filtrados = detalhamento.filter(item => {
      if (item.categoria !== 'SPOT') return true
      return item.status_operacional === 'PROGRAMADO' || item.status_operacional === 'EM_ROTA'
    })

    return [...filtrados].sort((a, b) => {
      const pesoA = statusOrdemPeso[a.status_operacional] ?? 99
      const pesoB = statusOrdemPeso[b.status_operacional] ?? 99
      if (pesoA !== pesoB) return pesoA - pesoB
      return a.motorista_nome.localeCompare(b.motorista_nome)
    })
  }, [detalhamento])

  const itensComAlocacao = React.useMemo(() => {
    return detalhamentoVisivel.filter(d => !!d.alocacao_id)
  }, [detalhamentoVisivel])

  const toggleSelectAlocacao = (alocId: string) => {
    setSelectedAlocacoes(prev =>
      prev.includes(alocId) ? prev.filter(id => id !== alocId) : [...prev, alocId]
    )
  }

  const handleToggleSelectAll = () => {
    const todosIds = itensComAlocacao.map(d => d.alocacao_id as string)
    if (selectedAlocacoes.length === todosIds.length) {
      setSelectedAlocacoes([])
    } else {
      setSelectedAlocacoes(todosIds)
    }
  }

  const handleSalvarStatusLote = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoteFormError(null)

    if (selectedAlocacoes.length === 0) {
      setLoteFormError('Nenhum recurso selecionado.')
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
        origem_alteracao: 'torre_cockpit',
      })
      toast.success(`Status de ${selectedAlocacoes.length} recurso(s) atualizado para ${loteNovoStatus}!`)
      setSelectedAlocacoes([])
      setDrawerLoteOpen(false)
      onReload?.()
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Erro ao atualizar status em lote.')
      setLoteFormError(msg)
      toast.error(msg)
    } finally {
      setSubmittingLote(false)
    }
  }

  // Estados e Handlers para Alteração Individual de Status
  const [selectedItemIndividual, setSelectedItemIndividual] = React.useState<DetalhamentoOperacional | null>(null)
  const [drawerIndividualOpen, setDrawerIndividualOpen] = React.useState(false)
  const [individualNovoStatus, setIndividualNovoStatus] = React.useState<StatusOperacional>('PROGRAMADO')
  const [individualMotivoId, setIndividualMotivoId] = React.useState<string>('')
  const [submittingIndividual, setSubmittingIndividual] = React.useState(false)
  const [individualFormError, setIndividualFormError] = React.useState<string | null>(null)

  const handleOpenAlterarStatusIndividual = (item: DetalhamentoOperacional) => {
    setSelectedItemIndividual(item)
    setIndividualNovoStatus((item.status_operacional as StatusOperacional) || 'PROGRAMADO')
    const motExistente = motivos.find(m => m.nome === item.motivo_indisponibilidade)
    setIndividualMotivoId(motExistente ? motExistente.id : (motivos.length > 0 ? motivos[0].id : ''))
    setIndividualFormError(null)
    setDrawerIndividualOpen(true)
  }

  const handleSalvarStatusIndividual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItemIndividual) return
    setIndividualFormError(null)

    if (individualNovoStatus === 'INDISPONIVEL' && !individualMotivoId) {
      setIndividualFormError('Selecione o motivo de indisponibilidade obrigatório.')
      return
    }

    setSubmittingIndividual(true)
    try {
      if (selectedItemIndividual.alocacao_id) {
        await torreService.atualizarStatusLote({
          alocacao_ids: [selectedItemIndividual.alocacao_id],
          novo_status: individualNovoStatus,
          motivo_indisponibilidade_id: individualNovoStatus === 'INDISPONIVEL' ? individualMotivoId : undefined,
          origem_alteracao: 'torre_cockpit',
        })
      } else {
        await torreService.atualizarStatusLote({
          motorista_ids: [selectedItemIndividual.motorista_id],
          novo_status: individualNovoStatus,
          motivo_indisponibilidade_id: individualNovoStatus === 'INDISPONIVEL' ? individualMotivoId : undefined,
          origem_alteracao: 'torre_cockpit',
        })
      }
      toast.success(`Status de "${selectedItemIndividual.motorista_nome}" atualizado para ${individualNovoStatus}!`)
      setDrawerIndividualOpen(false)
      onReload?.()
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Erro ao atualizar status do motorista.')
      setIndividualFormError(msg)
      toast.error(msg)
    } finally {
      setSubmittingIndividual(false)
    }
  }

  React.useEffect(() => {
    setMotoristaInput(filtros.motorista_nome || '')
  }, [filtros.motorista_nome])

  React.useEffect(() => {
    setPlacaInput(filtros.placa || '')
  }, [filtros.placa])

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (motoristaInput !== (filtros.motorista_nome || '')) {
        onFiltrosChange({ ...filtros, motorista_nome: motoristaInput, offset: 0 })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [motoristaInput])

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (placaInput !== (filtros.placa || '')) {
        onFiltrosChange({ ...filtros, placa: placaInput, offset: 0 })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [placaInput])

  const hasActiveFilters = !!(
    filtros.placa ||
    filtros.motorista_nome ||
    filtros.empresa_id ||
    filtros.status ||
    filtros.categoria ||
    filtros.tipo_veiculo ||
    filtros.especialidade
  )

  const currentPage = Math.floor((filtros.offset || 0) / (filtros.limite || 50)) + 1

  return (
    <Card
      title="Detalhamento Operacional dos Recursos"
      subtitle="Acompanhamento detalhado de motoristas, veículos físicos, placas, categorias e status individuais"
      className="bg-white border-slate-200 shadow-sm"
    >
      <div className="space-y-4">
        {/* Barra de Filtros Horizontais */}
        <FilterBar
          hasActiveFilters={hasActiveFilters}
          onClearFilters={() => {
            setMotoristaInput('')
            setPlacaInput('')
            onClearFiltros()
          }}
        >
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <SearchInput
              value={motoristaInput}
              onChange={e => setMotoristaInput(e.target.value)}
              onClear={() => {
                setMotoristaInput('')
                onFiltrosChange({ ...filtros, motorista_nome: '', offset: 0 })
              }}
              placeholder="Buscar motorista..."
              className="w-44"
            />

            <SearchInput
              value={placaInput}
              onChange={e => setPlacaInput(e.target.value)}
              onClear={() => {
                setPlacaInput('')
                onFiltrosChange({ ...filtros, placa: '', offset: 0 })
              }}
              placeholder="Buscar placa..."
              className="w-32"
            />

            <Select
              value={filtros.empresa_id || ''}
              onChange={e => onFiltrosChange({ ...filtros, empresa_id: e.target.value, offset: 0 })}
              placeholder="Empresa (Todas)"
              options={empresas.map(e => ({ value: e.id, label: e.nome }))}
              className="w-44"
            />

            <Select
              value={filtros.status || ''}
              onChange={e => onFiltrosChange({ ...filtros, status: e.target.value, offset: 0 })}
              placeholder="Status (Todos)"
              options={[
                { value: 'DISPONIVEL', label: 'DISPONIVEL' },
                { value: 'PROGRAMADO', label: 'PROGRAMADO' },
                { value: 'EM_ROTA', label: 'EM_ROTA' },
                { value: 'INDISPONIVEL', label: 'INDISPONIVEL' },
              ]}
              className="w-36"
            />

            <Select
              value={filtros.categoria || ''}
              onChange={e => onFiltrosChange({ ...filtros, categoria: e.target.value, offset: 0 })}
              placeholder="Categoria (Todas)"
              options={[
                { value: 'DEDICADO', label: 'DEDICADO' },
                { value: 'SPOT', label: 'SPOT' },
              ]}
              className="w-36"
            />

            <Select
              value={filtros.tipo_veiculo || ''}
              onChange={e => onFiltrosChange({ ...filtros, tipo_veiculo: e.target.value, offset: 0 })}
              placeholder="Veículo (Todos)"
              options={[
                { value: 'HR', label: 'HR' },
                { value: 'Fiorino', label: 'Fiorino' },
                { value: 'Truck', label: 'Truck' },
                { value: 'Toco', label: 'Toco' },
                { value: 'VUC', label: 'VUC' },
              ]}
              className="w-36"
            />
          </div>
        </FilterBar>

        {/* Barra de Ação em Lote */}
        {itensComAlocacao.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 p-2.5 border border-slate-300">
            <div className="flex items-center gap-2 text-xs">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleSelectAll}
                leftIcon={
                  selectedAlocacoes.length > 0 && selectedAlocacoes.length === itensComAlocacao.length ? (
                    <CheckSquare className="w-4 h-4 text-sky-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500" />
                  )
                }
              >
                {selectedAlocacoes.length === itensComAlocacao.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </Button>
              {selectedAlocacoes.length > 0 && (
                <span className="font-semibold text-slate-700">
                  ({selectedAlocacoes.length} selecionado(s))
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
                Alterar Status dos Selecionados ({selectedAlocacoes.length})
              </Button>
            )}
          </div>
        )}

        {/* Tabela Operacional */}
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-12 bg-slate-200/80 animate-pulse rounded-none" />
            <div className="h-12 bg-slate-200/80 animate-pulse rounded-none" />
            <div className="h-12 bg-slate-200/80 animate-pulse rounded-none" />
          </div>
        ) : detalhamentoVisivel.length === 0 ? (
          <EmptyState
            icon={<Truck className="w-12 h-12 text-slate-400" />}
            title="Nenhum recurso operacional encontrado"
            description={
              hasActiveFilters
                ? 'Ajuste os filtros da pesquisa para visualizar outros veículos ou motoristas.'
                : 'Nenhum recurso dedicado ou SPOT escalado/em rota para esta data operacional.'
            }
          />
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeadCell compact className="w-8 text-center">
                    <input
                      type="checkbox"
                      checked={itensComAlocacao.length > 0 && selectedAlocacoes.length === itensComAlocacao.length}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 text-sky-600 border-slate-300 rounded-none focus:ring-sky-500 cursor-pointer"
                      aria-label="Selecionar todos os recursos com alocação"
                    />
                  </TableHeadCell>
                  <TableHeadCell compact>Motorista</TableHeadCell>
                  <TableHeadCell compact>Veículo / Placa</TableHeadCell>
                  <TableHeadCell compact>Empresa</TableHeadCell>
                  <TableHeadCell compact>Categoria</TableHeadCell>
                  <TableHeadCell compact>Especialidade</TableHeadCell>
                  <TableHeadCell compact className="whitespace-nowrap">Status Operacional</TableHeadCell>
                  <TableHeadCell compact>Observação / Motivo</TableHeadCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detalhamentoVisivel.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell compact className="w-8 text-center">
                      <input
                        type="checkbox"
                        disabled={!item.alocacao_id}
                        checked={!!item.alocacao_id && selectedAlocacoes.includes(item.alocacao_id)}
                        onChange={() => item.alocacao_id && toggleSelectAlocacao(item.alocacao_id)}
                        className={`w-4 h-4 text-sky-600 border-slate-300 rounded-none focus:ring-sky-500 ${
                          item.alocacao_id ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'
                        }`}
                        title={item.alocacao_id ? 'Selecionar recurso' : 'Recurso sem alocação ativa'}
                      />
                    </TableCell>

                    <TableCell compact className="font-semibold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate max-w-[170px]" title={item.motorista_nome}>{item.motorista_nome}</span>
                      </div>
                    </TableCell>

                    <TableCell compact className="whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="text-slate-800 font-semibold">{item.tipo_veiculo}</span>
                        <span className="font-bold text-sky-700">[{item.placa}]</span>
                      </div>
                    </TableCell>

                    <TableCell compact className="text-slate-700 whitespace-nowrap">
                      <span className="truncate max-w-[140px] block" title={item.empresa_nome || '-'}>
                        {item.empresa_nome || '-'}
                      </span>
                    </TableCell>

                    <TableCell compact className="whitespace-nowrap">
                      <StatusBadge status={item.categoria} showIcon={false} size="sm" />
                    </TableCell>

                    <TableCell compact className="whitespace-nowrap">
                      <PerfilBadge perfil={item.especialidade} />
                    </TableCell>

                    <TableCell compact className="whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <StatusBadge
                          status={item.status_operacional}
                          size="sm"
                          onClick={() => handleOpenAlterarStatusIndividual(item)}
                          className="cursor-pointer hover:ring-1 hover:ring-sky-400 transition-all"
                          title="Clique para alterar status operacional"
                        />
                        <button
                          type="button"
                          onClick={() => handleOpenAlterarStatusIndividual(item)}
                          className="p-1 text-slate-400 hover:text-sky-700 hover:bg-slate-100 rounded-none transition-colors"
                          title={`Alterar status de ${item.motorista_nome}`}
                          aria-label={`Alterar status de ${item.motorista_nome}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>

                    <TableCell compact className="text-xs text-slate-500 whitespace-nowrap">
                      <span className="truncate max-w-[150px] block" title={item.motivo_indisponibilidade || '-'}>
                        {item.motivo_indisponibilidade ? (
                          <span className="text-rose-600 font-semibold">{item.motivo_indisponibilidade}</span>
                        ) : (
                          '-'
                        )}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Pagination
              currentPage={currentPage}
              totalItems={detalhamentoVisivel.length}
              itemsPerPage={filtros.limite || 50}
              onPageChange={page =>
                onFiltrosChange({ ...filtros, offset: (page - 1) * (filtros.limite || 50) })
              }
            />
          </div>
        )}
      </div>

      {/* Drawer Alterar Status em Lote */}
      <Drawer
        isOpen={drawerLoteOpen}
        onClose={() => setDrawerLoteOpen(false)}
        title={`Alterar Status em Lote (${selectedAlocacoes.length} selecionados)`}
        subtitle="Atualize a situação operacional de múltiplos recursos na Torre de Controle"
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
            <strong>Cockpit Operacional:</strong> A atualização em lote registra eventos operacionais individuais na trilha de auditoria para cada recurso selecionado.
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

      {/* Drawer Alterar Status Individual de Recurso/Motorista */}
      <Drawer
        isOpen={drawerIndividualOpen}
        onClose={() => setDrawerIndividualOpen(false)}
        title={selectedItemIndividual ? `Alterar Status: ${selectedItemIndividual.motorista_nome}` : 'Alterar Status do Motorista'}
        subtitle="Atualize o status operacional em tempo real diretamente na Torre de Controle"
      >
        {selectedItemIndividual && (
          <form onSubmit={handleSalvarStatusIndividual} className="space-y-4">
            {individualFormError && <Alert type="error">{individualFormError}</Alert>}

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-none text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Motorista:</span>
                <span className="font-semibold text-slate-900">{selectedItemIndividual.motorista_nome}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Veículo / Placa:</span>
                <span className="font-mono text-slate-800">{selectedItemIndividual.tipo_veiculo} [{selectedItemIndividual.placa}]</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Empresa:</span>
                <span className="text-slate-800">{selectedItemIndividual.empresa_nome || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Categoria:</span>
                <span className="font-semibold text-slate-800">{selectedItemIndividual.categoria}</span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-slate-200">
                <span className="text-slate-500">Status Atual:</span>
                <StatusBadge status={selectedItemIndividual.status_operacional} size="sm" />
              </div>
            </div>

            <Select
              label="Novo Status Operacional"
              value={individualNovoStatus}
              onChange={e => setIndividualNovoStatus(e.target.value as StatusOperacional)}
              options={[
                { value: 'DISPONIVEL', label: 'DISPONÍVEL (Livre / Aguardando)' },
                { value: 'PROGRAMADO', label: 'PROGRAMADO (Na Escala)' },
                { value: 'EM_ROTA', label: 'EM ROTA (Em Viagem)' },
                { value: 'INDISPONIVEL', label: 'INDISPONÍVEL (Registrar Motivo)' },
              ]}
              required
            />

            {individualNovoStatus === 'INDISPONIVEL' && (
              <Select
                label="Motivo de Indisponibilidade"
                value={individualMotivoId}
                onChange={e => setIndividualMotivoId(e.target.value)}
                placeholder="Selecione o motivo..."
                options={motivos.map(m => ({ value: m.id, label: m.nome }))}
                required
              />
            )}

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setDrawerIndividualOpen(false)} type="button">
                Cancelar
              </Button>
              <Button variant="primary" size="sm" isLoading={submittingIndividual} type="submit">
                Salvar Status
              </Button>
            </div>
          </form>
        )}
      </Drawer>
    </Card>
  )
}
