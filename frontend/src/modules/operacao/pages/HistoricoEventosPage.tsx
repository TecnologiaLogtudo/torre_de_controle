import React, { useEffect, useState, useCallback } from 'react'
import { torreService } from '@/services/torre/torreService'
import { empresasService } from '@/services/empresas/empresasService'
import { EventoOperacional, FiltrosHistoricoEventos } from '@/types/torre'
import { Empresa } from '@/types/empresas'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHeadCell,
  TableCell,
} from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/SearchInput'
import { Alert } from '@/components/ui/Alert'
import { formatToBahia, getHojeBahiaIso } from '@/utils/date'
import { getErrorMessage } from '@/services/api/errors'
import {
  Activity,
  Building2,
  Filter,
  RefreshCw,
  User,
  MapPin,
  Clock,
  AlertTriangle,
  Truck,
} from 'lucide-react'

export const HistoricoEventosPage: React.FC = () => {
  const hojeStr = getHojeBahiaIso()

  const [activeTab, setActiveTab] = useState<'eventos' | 'mapa'>('eventos')

  const [eventos, setEventos] = useState<EventoOperacional[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filtros, setFiltros] = useState<FiltrosHistoricoEventos>({
    data_inicio: hojeStr,
    data_fim: hojeStr,
    limite: 50,
    offset: 0,
  })

  const carregarEmpresas = useCallback(async () => {
    try {
      const data = await empresasService.listar()
      setEmpresas(data)
    } catch {
      // Ignorar se erro isolado
    }
  }, [])

  const carregarEventos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await torreService.listarHistoricoEventos(filtros)
      setEventos(data)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erro ao carregar o histórico compilado de eventos operacionais.'))
    } finally {
      setLoading(false)
    }
  }, [filtros])

  useEffect(() => {
    carregarEmpresas()
  }, [carregarEmpresas])

  useEffect(() => {
    if (activeTab === 'eventos') {
      carregarEventos()
    }
  }, [carregarEventos, activeTab])

  const handleClearFiltros = () => {
    setFiltros({
      data_inicio: hojeStr,
      data_fim: hojeStr,
      limite: 50,
      offset: 0,
    })
  }

  // Cálculos consolidados dos eventos exibidos
  const totalEventos = eventos.length
  const totalIndisponiveis = eventos.filter(e => e.novo_status === 'INDISPONIVEL').length
  const totalEmRota = eventos.filter(e => e.novo_status === 'EM_ROTA').length
  const totalProgramados = eventos.filter(e => e.novo_status === 'PROGRAMADO').length

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Central Operacional */}
      <PageHeader
        title="Central de Operação & Eventos"
        subtitle="Trilha histórica compilada de auditoria, transições operacionais e telemetria"
        badge={<Badge variant="PROGRAMADO">Fuso Oficial: America/Bahia</Badge>}
        actions={
          <Button variant="outline" size="sm" onClick={carregarEventos} isLoading={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar Feed
          </Button>
        }
      />

      {/* Tabs de Navegação Operacional */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('eventos')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'eventos'
              ? 'border-sky-700 text-sky-800'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Feed & Auditoria de Eventos</span>
        </button>

        <button
          onClick={() => setActiveTab('mapa')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'mapa'
              ? 'border-sky-700 text-sky-800'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <MapPin className="w-4 h-4 text-amber-600" />
          <span>Monitoramento em Rota (Mapa + Telemetria GPS)</span>
          <Badge variant="EM_BREVE" size="sm">
            Em breve
          </Badge>
        </button>
      </div>

      {activeTab === 'mapa' ? (
        <Card className="bg-white border-slate-200 p-12 text-center shadow-sm">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-none bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-500">
              <MapPin className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Módulo de Monitoramento & Telemetria em Tempo Real
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Em breve nesta aba: acompanhamento geográfico em mapa interativo, rastreamento via GPS dos veículos em rota (`EM_ROTA`), cálculo de estimativa de chegada (ETA) e alertas de desvio de percurso.
            </p>
            <div className="pt-2">
              <Button variant="secondary" size="sm" onClick={() => setActiveTab('eventos')}>
                Voltar para Trilha de Eventos Compilada
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Card de Filtros da Central de Eventos */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <Filter className="w-4 h-4 text-sky-700" />
                  <span>Filtros de Pesquisa Compilada</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleClearFiltros}>
                  Limpar Filtros
                </Button>
              </div>

              <div className="flex flex-wrap items-end gap-3 w-full">
                <div className="w-52">
                  <Select
                    label="Empresa Contratante"
                    value={filtros.empresa_id || ''}
                    onChange={e =>
                      setFiltros(prev => ({
                        ...prev,
                        empresa_id: e.target.value || undefined,
                        offset: 0,
                      }))
                    }
                    options={[
                      { value: '', label: 'Todas as Empresas' },
                      ...empresas.map(emp => ({ value: emp.id, label: emp.nome })),
                    ]}
                  />
                </div>

                <div className="w-44">
                  <Select
                    label="Categoria Operacional"
                    value={filtros.categoria || ''}
                    onChange={e =>
                      setFiltros(prev => ({
                        ...prev,
                        categoria: e.target.value || undefined,
                        offset: 0,
                      }))
                    }
                    options={[
                      { value: '', label: 'Todas as Categorias' },
                      { value: 'DEDICADO', label: 'DEDICADO' },
                      { value: 'SPOT', label: 'SPOT' },
                    ]}
                  />
                </div>

                <div className="w-44">
                  <Select
                    label="Status Destino"
                    value={filtros.novo_status || ''}
                    onChange={e =>
                      setFiltros(prev => ({
                        ...prev,
                        novo_status: e.target.value || undefined,
                        offset: 0,
                      }))
                    }
                    options={[
                      { value: '', label: 'Todos os Status' },
                      { value: 'PROGRAMADO', label: 'PROGRAMADO' },
                      { value: 'EM_ROTA', label: 'EM_ROTA' },
                      { value: 'INDISPONIVEL', label: 'INDISPONÍVEL' },
                      { value: 'DISPONIVEL', label: 'DISPONÍVEL' },
                    ]}
                  />
                </div>

                <div className="w-56">
                  <SearchInput
                    value={filtros.motorista_nome || filtros.placa || ''}
                    onChange={e => {
                      const val = e.target.value
                      setFiltros(prev => ({
                        ...prev,
                        motorista_nome: val || undefined,
                        placa: val || undefined,
                        offset: 0,
                      }))
                    }}
                    onClear={() =>
                      setFiltros(prev => ({
                        ...prev,
                        motorista_nome: undefined,
                        placa: undefined,
                        offset: 0,
                      }))
                    }
                    placeholder="Motorista ou placa..."
                  />
                </div>

                <div className="w-36">
                  <Input
                    type="date"
                    label="Data Início"
                    value={filtros.data_inicio || ''}
                    onChange={e =>
                      setFiltros(prev => ({
                        ...prev,
                        data_inicio: e.target.value || undefined,
                        offset: 0,
                      }))
                    }
                  />
                </div>

                <div className="w-36">
                  <Input
                    type="date"
                    label="Data Fim"
                    value={filtros.data_fim || ''}
                    onChange={e =>
                      setFiltros(prev => ({
                        ...prev,
                        data_fim: e.target.value || undefined,
                        offset: 0,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Cards de Métricas da Seleção */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-none border border-slate-200 border-t-2 border-t-slate-500 bg-white shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
                  Total de Eventos
                </span>
                <Activity className="w-4 h-4 text-slate-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
                {totalEventos}
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-sans">Registrados no filtro</p>
            </div>

            <div className="p-3.5 rounded-none border border-slate-200 border-t-2 border-t-rose-500 bg-white shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
                  Indisponibilidades
                </span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-bold text-rose-700 font-mono tracking-tight">
                {totalIndisponiveis}
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-sans">Mudanças com motivo</p>
            </div>

            <div className="p-3.5 rounded-none border border-slate-200 border-t-2 border-t-amber-500 bg-white shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
                  Em Rota
                </span>
                <Truck className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-amber-700 font-mono tracking-tight">
                {totalEmRota}
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-sans">Saídas iniciadas</p>
            </div>

            <div className="p-3.5 rounded-none border border-slate-200 border-t-2 border-t-sky-500 bg-white shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
                  Programados
                </span>
                <Clock className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-2xl font-bold text-sky-700 font-mono tracking-tight">
                {totalProgramados}
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-sans">Escalados na programação</p>
            </div>
          </div>

          {error && <Alert type="error">{error}</Alert>}

          {/* Tabela Principal Compilada */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeadCell>Data & Hora (Bahia)</TableHeadCell>
                <TableHeadCell>Empresa</TableHeadCell>
                <TableHeadCell>Motorista & Veículo</TableHeadCell>
                <TableHeadCell>Categoria</TableHeadCell>
                <TableHeadCell>Transição Operacional</TableHeadCell>
                <TableHeadCell>Responsável (Autor)</TableHeadCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Carregando eventos operacionais...
                  </TableCell>
                </TableRow>
              ) : eventos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Nenhum evento operacional encontrado para os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                eventos.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <span className="font-mono text-xs font-bold text-sky-700">
                        {formatToBahia(item.criado_em)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-purple-600 shrink-0" />
                        <span className="font-semibold text-slate-900">{item.empresa_nome || 'Empresa'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{item.motorista_nome || 'Motorista'}</span>
                        {item.veiculo_placa && (
                          <span className="text-[11px] font-mono text-slate-500">Placa: {item.veiculo_placa}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="NEUTRO">{item.categoria}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-mono text-slate-500">{item.status_anterior}</span>
                          <span className="text-sky-700 font-bold">➔</span>
                          <StatusBadge status={item.novo_status} size="sm" />
                        </div>
                        {item.motivo_indisponibilidade && (
                          <span className="text-[11px] text-rose-700">
                            Motivo: <strong>{item.motivo_indisponibilidade}</strong>
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-slate-700">
                        <User className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                        <span className="font-medium">{item.usuario_nome || 'Sistema'}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  )
}

