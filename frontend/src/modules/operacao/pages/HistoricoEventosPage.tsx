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
import { formatToBahia } from '@/utils/date'
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
  const hojeStr = new Date().toISOString().split('T')[0]

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
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar o histórico compilado de eventos operacionais.')
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
      <div className="flex border-b border-logtudo-border/60 gap-4">
        <button
          onClick={() => setActiveTab('eventos')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'eventos'
              ? 'border-logtudo-accent text-logtudo-accent'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Feed & Auditoria de Eventos</span>
        </button>

        <button
          onClick={() => setActiveTab('mapa')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'mapa'
              ? 'border-logtudo-accent text-logtudo-accent'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MapPin className="w-4 h-4 text-amber-400" />
          <span>Monitoramento em Rota (Mapa + Telemetria GPS)</span>
          <Badge variant="EM_BREVE" size="sm">
            Em breve
          </Badge>
        </button>
      </div>

      {activeTab === 'mapa' ? (
        <Card className="bg-logtudo-surface/40 border-logtudo-border/60 p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <MapPin className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">
              Módulo de Monitoramento & Telemetria em Tempo Real
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
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
          <Card className="bg-logtudo-surface/60 border-logtudo-border/60">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                  <Filter className="w-4 h-4 text-logtudo-accent" />
                  <span>Filtros de Pesquisa Compilada</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleClearFiltros}>
                  Limpar Filtros
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  placeholder="Nome do motorista ou placa..."
                />

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
          </Card>

          {/* Cards de Métricas da Seleção */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-logtudo-border/60 bg-logtudo-surface/80 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Total de Eventos
                </span>
                <Activity className="w-5 h-5 text-logtudo-accent" />
              </div>
              <div className="text-2xl font-extrabold text-logtudo-accent font-mono">
                {totalEventos}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Registrados no filtro</p>
            </div>

            <div className="p-4 rounded-xl border border-red-800/60 bg-red-950/40 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Indisponividades
                </span>
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div className="text-2xl font-extrabold text-red-400 font-mono">
                {totalIndisponiveis}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Mudanças com motivo</p>
            </div>

            <div className="p-4 rounded-xl border border-amber-800/60 bg-amber-950/40 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Em Rota
                </span>
                <Truck className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-2xl font-extrabold text-amber-400 font-mono">
                {totalEmRota}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Saídas iniciadas</p>
            </div>

            <div className="p-4 rounded-xl border border-blue-800/60 bg-blue-950/40 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Programados
                </span>
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-2xl font-extrabold text-blue-400 font-mono">
                {totalProgramados}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Escalados na programação</p>
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
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    Carregando eventos operacionais...
                  </TableCell>
                </TableRow>
              ) : eventos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    Nenhum evento operacional encontrado para os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                eventos.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <span className="font-mono text-xs font-bold text-logtudo-accent">
                        {formatToBahia(item.criado_em)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-purple-400 shrink-0" />
                        <span className="font-semibold text-slate-200">{item.empresa_nome || 'Empresa'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-100">{item.motorista_nome || 'Motorista'}</span>
                        {item.veiculo_placa && (
                          <span className="text-[11px] font-mono text-slate-400">Placa: {item.veiculo_placa}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="NEUTRO">{item.categoria}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-mono text-slate-400">{item.status_anterior}</span>
                          <span className="text-logtudo-accent font-bold">➔</span>
                          <StatusBadge status={item.novo_status} size="sm" />
                        </div>
                        {item.motivo_indisponibilidade && (
                          <span className="text-[11px] text-red-400">
                            Motivo: <strong>{item.motivo_indisponibilidade}</strong>
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <User className="w-3.5 h-3.5 text-logtudo-accent shrink-0" />
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
