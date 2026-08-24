import React from 'react'
import { DetalhamentoOperacional, FiltrosDetalhamentoTorre } from '@/types/torre'
import { Empresa } from '@/types/empresas'
import { Card } from '@/components/ui/Card'
import { FilterBar } from '@/components/ui/FilterBar'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { Table, TableHeader, TableBody, TableRow, TableHeadCell, TableCell } from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { Truck, UserCheck } from 'lucide-react'

export interface DetalhamentoTorreProps {
  detalhamento: DetalhamentoOperacional[]
  empresas: Empresa[]
  filtros: FiltrosDetalhamentoTorre
  onFiltrosChange: (novosFiltros: FiltrosDetalhamentoTorre) => void
  onClearFiltros: () => void
  isLoading: boolean
}

export const DetalhamentoTorre: React.FC<DetalhamentoTorreProps> = ({
  detalhamento,
  empresas,
  filtros,
  onFiltrosChange,
  onClearFiltros,
  isLoading,
}) => {
  const [motoristaInput, setMotoristaInput] = React.useState(filtros.motorista_nome || '')
  const [placaInput, setPlacaInput] = React.useState(filtros.placa || '')

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
      className="bg-logtudo-surface/40 border-logtudo-border/60"
    >
      <div className="space-y-4">
        {/* Barra de Filtros Combináveis */}
        <FilterBar
          hasActiveFilters={hasActiveFilters}
          onClearFilters={() => {
            setMotoristaInput('')
            setPlacaInput('')
            onClearFiltros()
          }}
        >
          <SearchInput
            value={motoristaInput}
            onChange={e => setMotoristaInput(e.target.value)}
            onClear={() => {
              setMotoristaInput('')
              onFiltrosChange({ ...filtros, motorista_nome: '', offset: 0 })
            }}
            placeholder="Buscar por motorista..."
            className="w-48"
          />

          <SearchInput
            value={placaInput}
            onChange={e => setPlacaInput(e.target.value)}
            onClear={() => {
              setPlacaInput('')
              onFiltrosChange({ ...filtros, placa: '', offset: 0 })
            }}
            placeholder="Buscar por placa..."
            className="w-36"
          />

          <Select
            value={filtros.empresa_id || ''}
            onChange={e => onFiltrosChange({ ...filtros, empresa_id: e.target.value, offset: 0 })}
            placeholder="Empresa (Todas)"
            options={empresas.map(e => ({ value: e.id, label: e.nome }))}
            className="w-48"
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
            className="w-40"
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
        </FilterBar>

        {/* Tabela Operacional */}
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-12 bg-logtudo-surface/40 animate-pulse rounded-lg" />
            <div className="h-12 bg-logtudo-surface/40 animate-pulse rounded-lg" />
            <div className="h-12 bg-logtudo-surface/40 animate-pulse rounded-lg" />
          </div>
        ) : detalhamento.length === 0 ? (
          <EmptyState
            icon={<Truck className="w-12 h-12 text-slate-600" />}
            title="Nenhum recurso operacional encontrado"
            description={
              hasActiveFilters
                ? 'Ajuste os filtros da pesquisa para visualizar outros veículos ou motoristas.'
                : 'Nenhum recurso alocado ou disponível para esta data operacional.'
            }
          />
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeadCell>Motorista</TableHeadCell>
                  <TableHeadCell>Veículo / Placa</TableHeadCell>
                  <TableHeadCell>Empresa Contratante</TableHeadCell>
                  <TableHeadCell>Categoria</TableHeadCell>
                  <TableHeadCell>Especialidade</TableHeadCell>
                  <TableHeadCell>Status Operacional</TableHeadCell>
                  <TableHeadCell>Observação / Motivo</TableHeadCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detalhamento.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-semibold text-slate-100 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{item.motorista_nome}</span>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="text-slate-300 font-semibold">{item.tipo_veiculo} - {item.veiculo_identificacao}</span>
                        <span className="font-bold text-logtudo-accent">[{item.placa}]</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-slate-300">{item.empresa_nome || '-'}</TableCell>

                    <TableCell>
                      <Badge variant={item.categoria === 'DEDICADO' ? 'PROGRAMADO' : 'EM_BREVE'}>
                        {item.categoria}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant={item.especialidade === 'REFRIGERADO' ? 'PROGRAMADO' : 'NEUTRO'}>
                        {item.especialidade}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={item.status_operacional} />
                    </TableCell>

                    <TableCell className="text-xs text-slate-400">
                      {item.motivo_indisponibilidade ? (
                        <span className="text-red-400 font-semibold">{item.motivo_indisponibilidade}</span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Pagination
              currentPage={currentPage}
              totalItems={detalhamento.length}
              itemsPerPage={filtros.limite || 50}
              onPageChange={page =>
                onFiltrosChange({ ...filtros, offset: (page - 1) * (filtros.limite || 50) })
              }
            />
          </div>
        )}
      </div>
    </Card>
  )
}
