import React, { useEffect, useState, useCallback } from 'react'
import { torreService } from '@/services/torre/torreService'
import { empresasService } from '@/services/empresas/empresasService'
import { MotoristasStatus, MotoristaStatus } from '@/types/torre'
import { Empresa } from '@/types/empresas'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/SearchInput'
import { FilterBar } from '@/components/ui/FilterBar'
import { Select } from '@/components/ui/Select'
import { Table, TableHeader, TableBody, TableRow, TableHeadCell, TableCell } from '@/components/ui/Table'
import { StatusBadge, PerfilBadge } from '@/components/ui/StatusBadge'
import { Alert } from '@/components/ui/Alert'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { getHojeBahiaIso } from '@/utils/date'
import { getErrorMessage } from '@/services/api/errors'
import { RefreshCw, UserCheck } from 'lucide-react'

const SEM_ALOCACAO_LABEL = 'Sem Alocação'

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
  const [statusData, setStatusData] = useState<MotoristasStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const carregarDados = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [status, empList] = await Promise.all([
        torreService.obterStatusMotoristas({
          data: dataFiltro,
          ...(filtroEmpresa ? { empresa_id: filtroEmpresa } : {}),
        }),
        empresasService.listar().catch(() => [] as Empresa[]),
      ])
      setStatusData(status)
      setEmpresas(empList)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erro ao carregar status dos motoristas.'))
    } finally {
      setLoading(false)
    }
  }, [dataFiltro, filtroEmpresa])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const motoristasFiltrados: MotoristaStatus[] = (statusData?.motoristas || []).filter(m => {
    const matchNome = m.motorista_nome.toLowerCase().includes(searchNome.toLowerCase())
    if (!matchNome) return false
    if (filtroStatus !== 'TODOS' && m.status_operacional !== filtroStatus) return false
    return true
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
              <TableHeadCell>Motorista</TableHeadCell>
              <TableHeadCell>Empresa</TableHeadCell>
              <TableHeadCell>Veículo / Placa</TableHeadCell>
              <TableHeadCell>Perfil</TableHeadCell>
              <TableHeadCell>Categoria</TableHeadCell>
              <TableHeadCell>Status Operacional</TableHeadCell>
              <TableHeadCell>Motivo Indisponibilidade</TableHeadCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {motoristasFiltrados.map(m => (
              <TableRow key={m.motorista_id}>
                <TableCell className="font-semibold text-slate-900">{m.motorista_nome}</TableCell>
                <TableCell className="text-slate-600 font-mono text-xs">{m.empresa_nome || '-'}</TableCell>
                <TableCell>
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
                <TableCell>
                  <PerfilBadge perfil={m.veiculo_especialidade} />
                </TableCell>
                <TableCell className="text-slate-600 font-mono text-xs">{m.categoria || '-'}</TableCell>
                <TableCell>
                  {m.status_operacional === 'SEM_ALOCACAO' ? (
                    <span className="inline-flex items-center rounded-none border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-700">
                      {SEM_ALOCACAO_LABEL}
                    </span>
                  ) : (
                    <StatusBadge status={m.status_operacional} />
                  )}
                </TableCell>
                <TableCell className="text-slate-600 text-xs font-sans">
                  {m.motivo_indisponibilidade || '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

