import React, { useEffect, useState, useCallback } from 'react'
import { contratosService } from '@/services/contratos/contratosService'
import { empresasService } from '@/services/empresas/empresasService'
import { motoristasService } from '@/services/motoristas/motoristasService'
import { veiculosService } from '@/services/veiculos/veiculosService'
import { Empresa } from '@/types/empresas'
import { ContratoConfiguracao, MotoristaDedicadoVinculo, CapacidadeItem } from '@/types/contratos'
import { Motorista } from '@/types/motoristas'
import { Veiculo } from '@/types/veiculos'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHeadCell, TableCell } from '@/components/ui/Table'
import { Drawer } from '@/components/ui/Drawer'
import { Alert } from '@/components/ui/Alert'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatToBahia } from '@/utils/date'
import { FileText, Plus, UserCheck, XCircle } from 'lucide-react'

export const ContratosPage: React.FC = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('')
  const [configuracaoVigente, setConfiguracaoVigente] = useState<ContratoConfiguracao | null>(null)
  const [historicoConfiguracoes, setHistoricoConfiguracoes] = useState<ContratoConfiguracao[]>([])
  const [vinculosAtivos, setVinculosAtivos] = useState<MotoristaDedicadoVinculo[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal/Drawer Nova Configuração de Capacidade
  const [drawerConfigOpen, setDrawerConfigOpen] = useState(false)
  const [dataInicioForm, setDataInicioForm] = useState(new Date().toISOString().split('T')[0])
  const [capacidadesForm, setCapacidadesForm] = useState<CapacidadeItem[]>([
    { tipo_veiculo: 'HR', especialidade: 'SECO', quantidade: 2 },
  ])
  const [submittingConfig, setSubmittingConfig] = useState(false)
  const [formConfigError, setFormConfigError] = useState<string | null>(null)

  // Modal/Drawer Novo Vínculo Dedicado (Binômio Motorista + Veículo)
  const [drawerVinculoOpen, setDrawerVinculoOpen] = useState(false)
  const [motoristaIdForm, setMotoristaIdForm] = useState('')
  const [veiculoIdForm, setVeiculoIdForm] = useState('')
  const [submittingVinculo, setSubmittingVinculo] = useState(false)
  const [formVinculoError, setFormVinculoError] = useState<string | null>(null)

  const carregarEmpresas = useCallback(async () => {
    try {
      const data = await empresasService.listar()
      setEmpresas(data)
      if (data.length > 0 && !selectedEmpresaId) {
        setSelectedEmpresaId(data[0].id)
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar lista de empresas.')
    }
  }, [selectedEmpresaId])

  useEffect(() => {
    carregarEmpresas()
  }, [carregarEmpresas])

  const carregarDadosEmpresa = useCallback(async (empresaId: string) => {
    if (!empresaId) return
    setLoading(true)
    setError(null)
    try {
      const [vigt, hist, vincs, mList, vecList] = await Promise.all([
        contratosService.obterConfiguracaoVigente(empresaId).catch(() => null),
        contratosService.obterHistoricoConfiguracoes(empresaId).catch(() => []),
        contratosService.listarVinculosAtivos().catch(() => []),
        motoristasService.listar().catch(() => []),
        veiculosService.listar().catch(() => []),
      ])

      setConfiguracaoVigente(vigt)
      setHistoricoConfiguracoes(hist)
      setVinculosAtivos(vincs.filter(v => v.empresa_id === empresaId && v.ativo))
      setMotoristas(mList)
      setVeiculos(vecList)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar configurações contratuais.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedEmpresaId) {
      carregarDadosEmpresa(selectedEmpresaId)
    }
  }, [selectedEmpresaId, carregarDadosEmpresa])

  // --- Handlers de Nova Configuração de Capacidade ---
  const handleAddCapacidadeRow = () => {
    setCapacidadesForm(prev => [
      ...prev,
      { tipo_veiculo: 'Fiorino', especialidade: 'SECO', quantidade: 1 },
    ])
  }

  const handleRemoveCapacidadeRow = (index: number) => {
    setCapacidadesForm(prev => prev.filter((_, i) => i !== index))
  }

  const handleSalvarConfiguracao = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormConfigError(null)

    if (!selectedEmpresaId) {
      setFormConfigError('Selecione uma empresa.')
      return
    }

    if (capacidadesForm.length === 0) {
      setFormConfigError('Adicione pelo menos um item de capacidade contratada.')
      return
    }

    setSubmittingConfig(true)
    try {
      await contratosService.criarConfiguracao(selectedEmpresaId, {
        data_inicio: dataInicioForm,
        capacidades: capacidadesForm,
      })
      setDrawerConfigOpen(false)
      carregarDadosEmpresa(selectedEmpresaId)
    } catch (err: any) {
      setFormConfigError(err.message || 'Erro ao registrar configuração contratual.')
    } finally {
      setSubmittingConfig(false)
    }
  }

  // --- Handlers de Novo Vínculo Dedicado ---
  const handleOpenNovoVinculo = () => {
    setMotoristaIdForm('')
    setVeiculoIdForm('')
    setFormVinculoError(null)
    setDrawerVinculoOpen(true)
  }

  const handleSalvarVinculo = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormVinculoError(null)

    if (!selectedEmpresaId || !motoristaIdForm || !veiculoIdForm) {
      setFormVinculoError('Selecione o motorista e o veículo físico.')
      return
    }

    const veiculoSelecionado = veiculos.find(v => v.id === veiculoIdForm)

    setSubmittingVinculo(true)
    try {
      await contratosService.criarVinculoDedicado({
        empresa_id: selectedEmpresaId,
        motorista_id: motoristaIdForm,
        veiculo_id: veiculoIdForm,
        tipo_veiculo: veiculoSelecionado?.tipo_veiculo,
        categoria_operacional: 'DEDICADO',
        categoria: 'DEDICADO',
      })
      setDrawerVinculoOpen(false)
      carregarDadosEmpresa(selectedEmpresaId)
    } catch (err: any) {
      setFormVinculoError(err.message || 'Erro ao vincular motorista dedicado.')
    } finally {
      setSubmittingVinculo(false)
    }
  }

  const handleDesativarVinculo = async (vinculoId: string) => {
    try {
      await contratosService.desativarVinculoDedicado(vinculoId)
      carregarDadosEmpresa(selectedEmpresaId)
    } catch (err: any) {
      alert(err.message || 'Erro ao desativar vínculo.')
    }
  }

  const empresaAtual = empresas.find(e => e.id === selectedEmpresaId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contratos & Capacidade Contratual"
        subtitle="Definição de capacidade contratada por tipo de veículo e gestão dos vínculos dedicados (Motorista + Veículo Físico)"
      />

      {/* Seleção da Empresa Contratante */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <FileText className="w-5 h-5 text-sky-400 shrink-0" />
          <div className="w-full sm:w-72">
            <Select
              label="Empresa Parceira / Contratante"
              value={selectedEmpresaId}
              onChange={e => setSelectedEmpresaId(e.target.value)}
              options={empresas.map(e => ({ value: e.id, label: `${e.nome} (${e.identificacao})` }))}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDrawerConfigOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Nova Configuração de Capacidade
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenNovoVinculo}
            leftIcon={<UserCheck className="w-4 h-4" />}
          >
            Vincular Motorista Dedicado
          </Button>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Esquerda: Configuração Vigente & Vínculos Dedicados */}
          <div className="lg:col-span-2 space-y-6">
            {/* Configuração Vigente */}
            <Card
              title={`Capacidade Vigente — ${empresaAtual?.nome || ''}`}
              subtitle="Configuração contratual ativa no período atual"
            >
              {!configuracaoVigente ? (
                <div className="p-4 bg-slate-950 rounded-lg border border-dashed border-slate-800 text-center text-xs text-slate-400">
                  Nenhuma configuração de capacidade vigente registrada para esta empresa.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-sky-950/40 border border-sky-800/80 rounded-lg text-xs">
                    <div>
                      <span className="text-slate-400 block">Vigência a partir de:</span>
                      <span className="font-mono font-bold text-sky-300">
                        {formatToBahia(configuracaoVigente.data_inicio, { hour: undefined, minute: undefined, second: undefined })}
                      </span>
                    </div>
                    <Badge variant="SUCESSO" dot>
                      VIGENTE
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(
                      configuracaoVigente.capacidades ||
                      (configuracaoVigente.regras
                        ? Object.entries(configuracaoVigente.regras).map(([tipo, qtd]) => ({
                            tipo_veiculo: tipo,
                            especialidade: 'SECO' as const,
                            quantidade: qtd,
                          }))
                        : [])
                    ).map((cap, idx) => (
                      <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-slate-100">{cap.tipo_veiculo}</span>
                          <Badge variant="NEUTRO" size="sm">
                            {cap.especialidade}
                          </Badge>
                        </div>
                        <span className="text-xl font-bold text-sky-400">{cap.quantidade}</span>
                        <span className="text-[11px] text-slate-400 block">vagas contratadas</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Vínculos de Dedicados */}
            <Card
              title="Recursos Dedicados Alocados"
              subtitle="Binômio operacional: Motorista + Veículo Físico associados a esta empresa"
              action={
                <Button variant="ghost" size="sm" onClick={handleOpenNovoVinculo} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  Novo Vínculo
                </Button>
              }
            >
              {vinculosAtivos.length === 0 ? (
                <div className="p-4 bg-slate-950 rounded-lg border border-dashed border-slate-800 text-center text-xs text-slate-400">
                  Nenhum motorista/veículo vinculado como dedicado para esta empresa.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHeadCell>Motorista</TableHeadCell>
                      <TableHeadCell>Veículo / Placa</TableHeadCell>
                      <TableHeadCell>Categoria</TableHeadCell>
                      <TableHeadCell className="text-right">Ação</TableHeadCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vinculosAtivos.map(vinc => {
                      const m = motoristas.find(mot => mot.id === vinc.motorista_id)
                      const vec = veiculos.find(ve => ve.id === vinc.veiculo_id)

                      return (
                        <TableRow key={vinc.id}>
                          <TableCell className="font-semibold text-slate-100">{m?.nome || 'Motorista'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 font-mono text-xs">
                              <span className="text-slate-400">{vec?.tipo_veiculo} - {vec?.identificacao}</span>
                              <span className="font-bold text-sky-400">[{vec?.placa || 'Sem placa'}]</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="PROGRAMADO">{vinc.categoria}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDesativarVinculo(vinc.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-950/40"
                              leftIcon={<XCircle className="w-3.5 h-3.5" />}
                            >
                              Desativar
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>

          {/* Coluna Direita: Histórico de Vigências Contratuais */}
          <div>
            <Card
              title="Histórico Contratual"
              subtitle="Configurações contratuais ordenadas por vigência"
            >
              {historicoConfiguracoes.length === 0 ? (
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-center text-xs text-slate-400">
                  Sem histórico registrado.
                </div>
              ) : (
                <div className="space-y-4">
                  {historicoConfiguracoes.map((config, index) => (
                    <div
                      key={config.id}
                      className={`p-4 rounded-lg border ${
                        index === 0
                          ? 'bg-sky-950/30 border-sky-800/80'
                          : 'bg-slate-950/60 border-slate-800/60 opacity-80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-200">
                          {index === 0 ? 'CONFIGURAÇÃO ATUAL' : `VIGÊNCIA ANTERIOR #${historicoConfiguracoes.length - index}`}
                        </span>
                        <Badge variant={index === 0 ? 'SUCESSO' : 'EM_BREVE'} size="sm">
                          {index === 0 ? 'Ativa' : 'Encerrada'}
                        </Badge>
                      </div>

                      <div className="text-[11px] text-slate-400 mb-2 font-mono">
                        {formatToBahia(config.data_inicio, { hour: undefined, minute: undefined, second: undefined })}
                        {config.data_fim ? ` até ${formatToBahia(config.data_fim, { hour: undefined, minute: undefined, second: undefined })}` : ' (em aberto)'}
                      </div>

                      <div className="space-y-1">
                        {(
                          config.capacidades ||
                          (config.regras
                            ? Object.entries(config.regras).map(([tipo, qtd]) => ({
                                tipo_veiculo: tipo,
                                especialidade: 'SECO' as const,
                                quantidade: qtd,
                              }))
                            : [])
                        ).map((cap, cIdx) => (
                          <div key={cIdx} className="flex items-center justify-between text-xs py-1 border-t border-slate-800/40">
                            <span className="text-slate-300">{cap.tipo_veiculo} ({cap.especialidade})</span>
                            <span className="font-bold text-sky-400">{cap.quantidade} vagas</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Drawer Nova Configuração de Capacidade */}
      <Drawer
        isOpen={drawerConfigOpen}
        onClose={() => setDrawerConfigOpen(false)}
        title="Nova Configuração de Capacidade"
        subtitle={`Empresa: ${empresaAtual?.nome || ''}`}
        size="lg"
      >
        <form onSubmit={handleSalvarConfiguracao} className="space-y-4">
          {formConfigError && <Alert type="error">{formConfigError}</Alert>}

          <Input
            label="Data de Início da Nova Vigência"
            type="date"
            value={dataInicioForm}
            onChange={e => setDataInicioForm(e.target.value)}
            required
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Capacidades Contratadas por Tipo de Veículo
              </label>
              <Button variant="ghost" size="sm" onClick={handleAddCapacidadeRow} type="button">
                + Adicionar Veículo
              </Button>
            </div>

            <div className="space-y-3">
              {capacidadesForm.map((item, index) => (
                <div key={index} className="flex items-end gap-2 p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="flex-1">
                    <Select
                      label="Tipo de Veículo"
                      value={item.tipo_veiculo}
                      onChange={e => {
                        const val = e.target.value
                        setCapacidadesForm(prev =>
                          prev.map((c, i) => (i === index ? { ...c, tipo_veiculo: val } : c))
                        )
                      }}
                      options={[
                        { value: 'HR', label: 'HR' },
                        { value: 'Fiorino', label: 'Fiorino' },
                        { value: 'Truck', label: 'Truck' },
                        { value: 'Toco', label: 'Toco' },
                        { value: 'VUC', label: 'VUC' },
                      ]}
                    />
                  </div>

                  <div className="w-36">
                    <Select
                      label="Especialidade"
                      value={item.especialidade}
                      onChange={e => {
                        const val = e.target.value as any
                        setCapacidadesForm(prev =>
                          prev.map((c, i) => (i === index ? { ...c, especialidade: val } : c))
                        )
                      }}
                      options={[
                        { value: 'SECO', label: 'SECO' },
                        { value: 'REFRIGERADO', label: 'REFRIGERADO' },
                      ]}
                    />
                  </div>

                  <div className="w-24">
                    <Input
                      label="Qtd Vagas"
                      type="number"
                      min={1}
                      value={item.quantidade}
                      onChange={e => {
                        const q = parseInt(e.target.value) || 1
                        setCapacidadesForm(prev =>
                          prev.map((c, i) => (i === index ? { ...c, quantidade: q } : c))
                        )
                      }}
                    />
                  </div>

                  {capacidadesForm.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCapacidadeRow(index)}
                      className="text-red-400 hover:text-red-300"
                      type="button"
                    >
                      Remover
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setDrawerConfigOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="primary" size="sm" isLoading={submittingConfig} type="submit">
              Salvar Nova Vigência
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Drawer Vincular Motorista Dedicado */}
      <Drawer
        isOpen={drawerVinculoOpen}
        onClose={() => setDrawerVinculoOpen(false)}
        title="Vincular Motorista Dedicado"
        subtitle={`Empresa: ${empresaAtual?.nome || ''}`}
      >
        <form onSubmit={handleSalvarVinculo} className="space-y-4">
          {formVinculoError && <Alert type="error">{formVinculoError}</Alert>}

          <Select
            label="Motorista"
            value={motoristaIdForm}
            onChange={e => setMotoristaIdForm(e.target.value)}
            placeholder="Selecione o motorista..."
            options={motoristas.map(m => ({ value: m.id, label: m.nome }))}
            required
          />

          <Select
            label="Veículo Físico"
            value={veiculoIdForm}
            onChange={e => setVeiculoIdForm(e.target.value)}
            placeholder="Selecione o veículo..."
            options={veiculos.map(v => ({
              value: v.id,
              label: `${v.tipo_veiculo} - ${v.identificacao} [${v.placa}] (${v.especialidade})`,
            }))}
            required
          />

          <div className="p-3 bg-sky-950/40 border border-sky-800/60 rounded-lg text-xs text-sky-300">
            <strong>Binômio Operacional:</strong> A associação criará o vínculo do motorista com o veículo físico selecionado especificamente para esta empresa.
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setDrawerVinculoOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="primary" size="sm" isLoading={submittingVinculo} type="submit">
              Confirmar Vínculo
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  )
}
