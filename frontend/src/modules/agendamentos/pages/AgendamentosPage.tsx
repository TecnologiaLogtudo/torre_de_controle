import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { agendamentosService } from '@/services/agendamentos/agendamentosService'
import { empresasService } from '@/services/empresas/empresasService'
import { contratosService } from '@/services/contratos/contratosService'
import { Agendamento } from '@/types/agendamentos'
import { Empresa } from '@/types/empresas'
import { ContratoConfiguracao } from '@/types/contratos'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { FilterBar } from '@/components/ui/FilterBar'
import { Table, TableHeader, TableBody, TableRow, TableHeadCell, TableCell } from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Pagination } from '@/components/ui/Pagination'
import { Drawer } from '@/components/ui/Drawer'
import { Alert } from '@/components/ui/Alert'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatToBahia } from '@/utils/date'
import { Calendar, Plus, Eye, Clock, CheckCircle2, AlertTriangle, Building2 } from 'lucide-react'

export const AgendamentosPage: React.FC = () => {
  const navigate = useNavigate()
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [filtroEmpresaId, setFiltroEmpresaId] = useState('')
  const [filtroData, setFiltroData] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  // Modal/Drawer Novo Agendamento
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [empresaIdForm, setEmpresaIdForm] = useState('')
  const [dataForm, setDataForm] = useState('')
  const [horarioInicioForm, setHorarioInicioForm] = useState('08:00')
  const [configVigente, setConfigVigente] = useState<ContratoConfiguracao | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const hojeBahiaStr = new Date().toISOString().split('T')[0]
  const amanhaDate = new Date()
  amanhaDate.setDate(amanhaDate.getDate() + 1)
  const amanhaBahiaStr = amanhaDate.toISOString().split('T')[0]

  const carregarEmpresas = useCallback(async () => {
    try {
      const data = await empresasService.listar()
      setEmpresas(data)
    } catch {
      // Ignore
    }
  }, [])

  const carregarAgendamentos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const offset = (currentPage - 1) * itemsPerPage
      const res = await agendamentosService.listar({
        empresa_id: filtroEmpresaId || undefined,
        data: filtroData || undefined,
        status: filtroStatus || undefined,
        limite: itemsPerPage,
        offset,
        paginado: true,
      })

      if ('items' in res) {
        setAgendamentos(res.items)
        setTotalItems(res.total)
      } else {
        setAgendamentos(res as Agendamento[])
        setTotalItems((res as Agendamento[]).length)
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar lista de agendamentos.')
    } finally {
      setLoading(false)
    }
  }, [currentPage, filtroEmpresaId, filtroData, filtroStatus])

  useEffect(() => {
    carregarEmpresas()
  }, [carregarEmpresas])

  useEffect(() => {
    carregarAgendamentos()
  }, [carregarAgendamentos])

  // Busca configuração vigente da empresa selecionada para exibir prévia visual das vagas
  useEffect(() => {
    if (empresaIdForm) {
      contratosService
        .obterConfiguracaoVigente(empresaIdForm)
        .then(setConfigVigente)
        .catch(() => setConfigVigente(null))
    } else {
      setConfigVigente(null)
    }
  }, [empresaIdForm])

  const handleOpenNovo = () => {
    setEmpresaIdForm(empresas.length > 0 ? empresas[0].id : '')
    setDataForm(hojeBahiaStr)
    setHorarioInicioForm('08:00')
    setFormError(null)
    setDrawerOpen(true)
  }

  const handleSalvarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!empresaIdForm || !dataForm) {
      setFormError('Selecione a empresa e a data do agendamento.')
      return
    }

    setSubmitting(true)
    try {
      const novo = await agendamentosService.criar({
        empresa_id: empresaIdForm,
        data: dataForm,
        horario_inicio: horarioInicioForm || '08:00',
      })
      setDrawerOpen(false)
      navigate(`/app/agendamentos/${novo.id}`)
    } catch (err: any) {
      setFormError(err.message || 'Erro ao criar agendamento.')
    } finally {
      setSubmitting(false)
    }
  }

  const getEmpresaNome = (id: string) => {
    return empresas.find(e => e.id === id)?.nome || 'Empresa'
  }

  const isHoje = dataForm === hojeBahiaStr
  const isAmanha = dataForm === amanhaBahiaStr

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agendamentos Operacionais"
        subtitle="Gestão de janelas de programação diária, preenchimento contratual de dedicados e alocações SPOT"
        actions={
          <Button variant="primary" onClick={handleOpenNovo} leftIcon={<Plus className="w-4 h-4" />}>
            Novo Agendamento
          </Button>
        }
      />

      {error && <Alert type="error">{error}</Alert>}

      {/* Filtros da Listagem */}
      <FilterBar
        hasActiveFilters={!!(filtroEmpresaId || filtroData || filtroStatus)}
        onClearFilters={() => {
          setFiltroEmpresaId('')
          setFiltroData('')
          setFiltroStatus('')
          setCurrentPage(1)
        }}
      >
        <Select
          value={filtroEmpresaId}
          onChange={e => {
            setFiltroEmpresaId(e.target.value)
            setCurrentPage(1)
          }}
          placeholder="Empresa (Todas)"
          options={empresas.map(e => ({ value: e.id, label: e.nome }))}
          className="w-56"
        />

        <Input
          type="date"
          value={filtroData}
          onChange={e => {
            setFiltroData(e.target.value)
            setCurrentPage(1)
          }}
          className="w-40"
        />

        <Select
          value={filtroStatus}
          onChange={e => {
            setFiltroStatus(e.target.value)
            setCurrentPage(1)
          }}
          placeholder="Status (Todos)"
          options={[
            { value: 'DISPONIVEL', label: 'DISPONIVEL' },
            { value: 'PROGRAMADO', label: 'PROGRAMADO' },
            { value: 'EM_ROTA', label: 'EM_ROTA' },
            { value: 'INDISPONIVEL', label: 'INDISPONIVEL' },
          ]}
          className="w-44"
        />
      </FilterBar>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : agendamentos.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-12 h-12 text-slate-600" />}
          title="Nenhum agendamento encontrado"
          description="Ajuste os filtros ou crie um novo agendamento para a empresa contratante."
          action={
            <Button variant="outline" size="sm" onClick={handleOpenNovo}>
              Criar Novo Agendamento
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeadCell>Empresa Contratante</TableHeadCell>
                <TableHeadCell>Data Operacional</TableHeadCell>
                <TableHeadCell>Horário de Início</TableHeadCell>
                <TableHeadCell>Status Geral</TableHeadCell>
                <TableHeadCell>Recursos Alocados</TableHeadCell>
                <TableHeadCell className="text-right">Ação</TableHeadCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agendamentos.map(ag => (
                <TableRow key={ag.id}>
                  <TableCell className="font-semibold text-slate-100">
                    {getEmpresaNome(ag.empresa_id)}
                  </TableCell>
                  <TableCell className="font-mono text-slate-300">
                    {formatToBahia(ag.data, { hour: undefined, minute: undefined, second: undefined })}
                  </TableCell>
                  <TableCell className="font-mono text-sky-400 font-bold">
                    {ag.horario_inicio || '08:00:00'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={ag.status || 'PROGRAMADO'} />
                  </TableCell>
                  <TableCell className="text-xs text-slate-300">
                    <span className="font-bold text-sky-300">{ag.alocacoes.length}</span> veículos/motoristas
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/app/agendamentos/${ag.id}`)}
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                    >
                      Abrir Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Drawer de Novo Agendamento */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Novo Agendamento Operacional"
        subtitle="Abertura de programação diária com alocação automática de dedicados"
        size="lg"
      >
        <form onSubmit={handleSalvarAgendamento} className="space-y-5">
          {formError && <Alert type="error">{formError}</Alert>}

          <Select
            label="Empresa Contratante"
            value={empresaIdForm}
            onChange={e => setEmpresaIdForm(e.target.value)}
            options={empresas.map(e => ({ value: e.id, label: e.nome }))}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Data da Programação"
              type="date"
              value={dataForm}
              onChange={e => setDataForm(e.target.value)}
              required
            />

            <Input
              label="Horário Padrão de Início"
              type="time"
              value={horarioInicioForm}
              onChange={e => setHorarioInicioForm(e.target.value)}
              required
            />
          </div>

          {/* Orientação Visual de Regra de Data */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center gap-3">
            <Clock className="w-5 h-5 text-sky-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-slate-200 block">Orientação da Janela:</span>
              {isHoje ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 inline" /> Agendamento para HOJE (Sujeito ao horário limite)
                </span>
              ) : isAmanha ? (
                <span className="text-sky-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 inline" /> Agendamento para AMANHÃ (Janela padrão aberta)
                </span>
              ) : (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 inline" /> Data selecionada: {dataForm}
                </span>
              )}
            </div>
          </div>

          {/* Prévia da Composição Contratual de Dedicados */}
          {configVigente && (
            <div className="p-4 bg-sky-950/30 border border-sky-800/60 rounded-lg space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-300 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Prévia da Capacidade Contratada (Preenchimento Automático)
              </h4>
              <p className="text-[11px] text-slate-400">
                Os recursos dedicados ativos serão automaticamente alocados para ocupar as vagas da empresa:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {(
                  configVigente.capacidades ||
                  (configVigente.regras
                    ? Object.entries(configVigente.regras).map(([tipo, qtd]) => ({
                        tipo_veiculo: tipo,
                        especialidade: 'SECO' as const,
                        quantidade: qtd,
                      }))
                    : [])
                ).map((cap, idx) => (
                  <div key={idx} className="bg-slate-950 p-2 rounded border border-slate-800 text-[11px]">
                    <span className="font-bold text-slate-200 block">{cap.tipo_veiculo}</span>
                    <span className="text-slate-400">{cap.especialidade}: </span>
                    <span className="font-bold text-sky-400">{cap.quantidade} vagas</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="primary" size="sm" isLoading={submitting} type="submit">
              Criar e Abrir Agendamento
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  )
}
