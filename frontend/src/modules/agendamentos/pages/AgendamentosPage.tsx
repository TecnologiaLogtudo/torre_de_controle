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
import { Modal } from '@/components/ui/Modal'
import { Alert } from '@/components/ui/Alert'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { getHojeBahiaIso, formatDateBahia } from '@/utils/date'
import { toast } from '@/components/feedback/Toaster'
import { getErrorMessage } from '@/services/api/errors'
import { Calendar, Plus, Eye, Clock, CheckCircle2, Building2 } from 'lucide-react'

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

  // Modal de Concluir Agendamento
  const [agendamentoParaConcluir, setAgendamentoParaConcluir] = useState<Agendamento | null>(null)
  const [concluindo, setConcluindo] = useState(false)

  const handleConfirmarConcluir = async () => {
    if (!agendamentoParaConcluir) return
    setConcluindo(true)
    try {
      await agendamentosService.concluir(agendamentoParaConcluir.id)
      toast.success('Agendamento concluído com sucesso! Recursos retornados para Disponível.')
      setAgendamentoParaConcluir(null)
      carregarAgendamentos()
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erro ao concluir agendamento.'))
    } finally {
      setConcluindo(false)
    }
  }

  const hojeBahiaStr = getHojeBahiaIso()
  const amanhaBahiaStr = getHojeBahiaIso(1)

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

      setAgendamentos(res.items)
      setTotalItems(res.total)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erro ao carregar lista de agendamentos.'))
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
      toast.success('Agendamento criado com sucesso!', {
        description: `Empresa: ${getEmpresaNome(empresaIdForm)} • Data: ${formatDateBahia(dataForm)}`,
      })
      setDrawerOpen(false)
      navigate(`/app/agendamentos/${novo.id}`)
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Erro ao criar agendamento.')
      setFormError(msg)
      toast.error(msg)
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
            { value: 'RASCUNHO', label: 'RASCUNHO' },
            { value: 'PROGRAMADO', label: 'PROGRAMADO' },
            { value: 'EM_EXECUCAO', label: 'EM_EXECUCAO' },
            { value: 'CONCLUIDO', label: 'CONCLUIDO' },
            { value: 'CANCELADO', label: 'CANCELADO' },
          ]}
          className="w-44"
        />
      </FilterBar>

      {loading ? (
        <TableSkeleton rows={6} />
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
                <TableHeadCell>Empresa</TableHeadCell>
                <TableHeadCell>Data Operacional</TableHeadCell>
                <TableHeadCell>Horário de Início</TableHeadCell>
                <TableHeadCell>Status & Versão</TableHeadCell>
                <TableHeadCell>Recursos Alocados</TableHeadCell>
                <TableHeadCell className="text-right">Ação</TableHeadCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agendamentos.map(ag => (
                <TableRow key={ag.id}>
                  <TableCell className="font-semibold text-slate-900">
                    {getEmpresaNome(ag.empresa_id)}
                  </TableCell>
                  <TableCell className="font-mono text-slate-700">
                    {formatDateBahia(ag.data)}
                  </TableCell>
                  <TableCell className="font-mono text-sky-700 font-bold">
                    {ag.horario_inicio || '08:00:00'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded-none text-[11px] font-mono font-bold bg-sky-50 text-sky-700 border border-sky-200"
                        title="Versão do Agendamento (consecutiva a cada alteração)"
                      >
                        v{ag.versao || 1}
                      </span>
                      <StatusBadge status={ag.status || 'PROGRAMADO'} />
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>
                        <strong className="text-slate-900 font-mono">{ag.alocacoes.length}</strong> recursos
                      </span>
                      {ag.alocacoes.some(a => a.status_operacional === 'INDISPONIVEL') && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-950 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-none">
                          ⚠️ Indisponível
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {ag.versao && ag.versao >= 1 && ['PROGRAMADO', 'EM_EXECUCAO'].includes(ag.status) && ag.data <= hojeBahiaStr && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setAgendamentoParaConcluir(ag)}
                          leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                          title="Concluir agendamento e confirmar retorno de recursos"
                        >
                          Concluir
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/app/agendamentos/${ag.id}`)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Abrir Detalhes
                      </Button>
                    </div>
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
        subtitle="Abertura de programação diária com auto-alocação de dedicados (v1 inicial)"
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
              label="Data da Programação (D+0 sem corte a D+7)"
              type="date"
              min={hojeBahiaStr}
              max={getHojeBahiaIso(7)}
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

          {/* Orientação Visual da Janela */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-none flex items-center gap-3">
            <Clock className="w-5 h-5 text-sky-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-slate-800 block">Janela Operacional:</span>
              {isHoje ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 inline" /> Agendamento para HOJE (D+0 liberado)
                </span>
              ) : isAmanha ? (
                <span className="text-sky-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 inline" /> Agendamento para AMANHÃ (D+1 padrão)
                </span>
              ) : (
                <span className="text-sky-700 font-semibold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 inline" /> Agendamento futuro ({dataForm})
                </span>
              )}
            </div>
          </div>

          {/* Prévia da Composição Contratual de Dedicados */}
          {configVigente && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-none space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-sky-600" />
                  Balanço Contratual em Tempo Real
                </h4>
                <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold bg-sky-100 text-sky-800 border border-sky-200">
                  Início em v1
                </span>
              </div>

              <p className="text-[11px] text-slate-600">
                Os recursos dedicados serão auto-alocados para a data selecionada. Caso algum dedicado esteja indisponível, será alocado com alerta visual para cobertura SPOT.
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
                  <div key={idx} className="bg-white p-2.5 rounded-none border border-slate-200 text-[11px] flex items-center justify-between shadow-sm">
                    <div>
                      <span className="font-bold text-slate-900 block">{cap.tipo_veiculo}</span>
                      <span className={cap.especialidade === 'SECO' ? 'text-red-500 font-semibold' : 'text-blue-500 font-semibold'}>
                        {cap.especialidade}
                      </span>
                    </div>
                    <span className="font-bold text-sky-700 text-sm">{cap.quantidade} vagas</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="primary" size="sm" isLoading={submitting} type="submit">
              Criar e Abrir Agendamento
            </Button>
          </div>
        </form>
      </Drawer>
      {/* Modal de Confirmação para Concluir Agendamento */}
      <Modal
        isOpen={!!agendamentoParaConcluir}
        onClose={() => setAgendamentoParaConcluir(null)}
        title="Concluir Agendamento Operacional"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAgendamentoParaConcluir(null)}
              disabled={concluindo}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmarConcluir}
              isLoading={concluindo}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Confirmar Conclusão
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-slate-700">
          <p>
            Você está prestes a concluir o agendamento da empresa{' '}
            <strong>{agendamentoParaConcluir ? getEmpresaNome(agendamentoParaConcluir.empresa_id) : 'Empresa'}</strong> referente à data{' '}
            <strong>{agendamentoParaConcluir?.data ? formatDateBahia(agendamentoParaConcluir.data) : ''}</strong>.
          </p>
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-none space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              Retorno Automático de Recursos:
            </p>
            <p>
              Todas as alocações que ainda estiverem com status <strong>"Em rota"</strong> ou <strong>"Programado"</strong> nesta programação terão seu retorno confirmado automaticamente para <strong>"Disponível"</strong>, liberando os motoristas e veículos para novas escalas.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}