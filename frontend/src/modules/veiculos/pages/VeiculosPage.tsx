import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { veiculosService } from '@/services/veiculos/veiculosService'
import { contratosService } from '@/services/contratos/contratosService'
import { motoristasService } from '@/services/motoristas/motoristasService'
import { empresasService } from '@/services/empresas/empresasService'
import { Veiculo, EspecialidadeVeiculo } from '@/types/veiculos'
import { MotoristaDedicadoVinculo } from '@/types/contratos'
import { Motorista } from '@/types/motoristas'
import { Empresa } from '@/types/empresas'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/SearchInput'
import { FilterBar } from '@/components/ui/FilterBar'
import { Select } from '@/components/ui/Select'
import { Table, TableHeader, TableBody, TableRow, TableHeadCell, TableCell } from '@/components/ui/Table'
import { StatusBadge, PerfilBadge } from '@/components/ui/StatusBadge'
import { Badge } from '@/components/ui/Badge'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from '@/components/feedback/Toaster'
import { getErrorMessage } from '@/services/api/errors'
import { Truck, Plus, Edit, Link2, Unlink } from 'lucide-react'

export const VeiculosPage: React.FC = () => {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [vinculos, setVinculos] = useState<MotoristaDedicadoVinculo[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [searchPlaca, setSearchPlaca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroEspecialidade, setFiltroEspecialidade] = useState('')

  // Drawer Cadastro/Edição
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedVeiculo, setSelectedVeiculo] = useState<Veiculo | null>(null)
  const [placaForm, setPlacaForm] = useState('')
  const [tipoForm, setTipoForm] = useState('')
  const [especialidadeForm, setEspecialidadeForm] = useState<EspecialidadeVeiculo>('SECO')
  const [ativoForm, setAtivoForm] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Drawer Vinculação de Motorista
  const [drawerVinculoOpen, setDrawerVinculoOpen] = useState(false)
  const [veiculoParaVinculo, setVeiculoParaVinculo] = useState<Veiculo | null>(null)
  const [vinculoAtualVeiculo, setVinculoAtualVeiculo] = useState<MotoristaDedicadoVinculo | null>(null)
  const [motoristaIdForm, setMotoristaIdForm] = useState('')
  const [categoriaForm, setCategoriaForm] = useState<'SPOT' | 'DEDICADO'>('SPOT')
  const [empresaIdForm, setEmpresaIdForm] = useState('')
  const [submittingVinculo, setSubmittingVinculo] = useState(false)
  const [vinculoError, setVinculoError] = useState<string | null>(null)

  const carregarDados = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [vList, vincList, mList, empList] = await Promise.all([
        veiculosService.listar(1000),
        contratosService.listarVinculosAtivos(1000).catch(() => []),
        motoristasService.listar(1000).catch(() => []),
        empresasService.listar().catch(() => []),
      ])
      setVeiculos(vList)
      setVinculos(vincList)
      setMotoristas(mList)
      setEmpresas(empList)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erro ao carregar lista de veículos.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const handleOpenNovo = () => {
    setSelectedVeiculo(null)
    setPlacaForm('')
    setTipoForm('HR')
    setEspecialidadeForm('SECO')
    setAtivoForm(true)
    setFormError(null)
    setDrawerOpen(true)
  }

  const handleOpenEditar = (v: Veiculo) => {
    setSelectedVeiculo(v)
    setPlacaForm(v.placa)
    setTipoForm(v.tipo_veiculo)
    setEspecialidadeForm(v.especialidade)
    setAtivoForm(v.ativo)
    setFormError(null)
    setDrawerOpen(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const placaClean = placaForm.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (placaClean.length !== 7) {
      setFormError('A placa deve conter exatamente 7 caracteres alfanuméricos (Mercosul ou tradicional).')
      return
    }

    if (!tipoForm.trim()) {
      setFormError('Preencha todos os campos obrigatórios.')
      return
    }

    setSubmitting(true)
    try {
      if (selectedVeiculo) {
        await veiculosService.atualizar(selectedVeiculo.id, {
          placa: placaClean,
          tipo_veiculo: tipoForm.trim(),
          especialidade: especialidadeForm,
          ativo: ativoForm,
        })
        toast.success(`Veículo "${placaClean}" atualizado com sucesso!`)
      } else {
        await veiculosService.criar({
          placa: placaClean,
          tipo_veiculo: tipoForm.trim(),
          especialidade: especialidadeForm,
        })
        toast.success(`Veículo "${placaClean}" cadastrado com sucesso!`)
      }
      setDrawerOpen(false)
      carregarDados()
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Erro ao salvar dados do veículo.')
      setFormError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (v: Veiculo) => {
    try {
      setError(null)
      const novoStatus = !v.ativo
      await veiculosService.atualizar(v.id, {
        identificacao: v.identificacao,
        placa: v.placa,
        tipo_veiculo: v.tipo_veiculo,
        especialidade: v.especialidade,
        ativo: novoStatus,
      })
      toast.success(`Veículo "${v.placa}" ${novoStatus ? 'ativado' : 'inativado'} com sucesso.`)
      await carregarDados()
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Erro ao alterar status do veículo.')
      setError(msg)
      toast.error(msg)
    }
  }

  const handleOpenVinculo = (v: Veiculo) => {
    setVeiculoParaVinculo(v)
    const vinc = vinculos.find(vin => vin.veiculo_id === v.id && vin.ativo) || null
    setVinculoAtualVeiculo(vinc)
    setMotoristaIdForm(vinc?.motorista_id || '')
    const cat = (vinc?.categoria || vinc?.categoria_operacional || 'SPOT') as 'SPOT' | 'DEDICADO'
    setCategoriaForm(cat)
    setEmpresaIdForm(vinc?.empresa_id || (empresas.length > 0 ? empresas[0].id : ''))
    setVinculoError(null)
    setDrawerVinculoOpen(true)
  }

  const motoristasDisponiveisParaVinculo = useMemo(() => {
    const motoristasOcupadosPorOutros = new Set(
      vinculos
        .filter(vin => vin.ativo && vin.motorista_id && vin.veiculo_id !== veiculoParaVinculo?.id)
        .map(vin => vin.motorista_id)
    )
    return motoristas.filter(m => m.ativo && !motoristasOcupadosPorOutros.has(m.id))
  }, [motoristas, vinculos, veiculoParaVinculo])

  const handleSalvarVinculo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!veiculoParaVinculo) return
    setVinculoError(null)

    if (!motoristaIdForm) {
      setVinculoError('Selecione um motorista para vincular a este veículo.')
      return
    }

    if (categoriaForm === 'DEDICADO' && !empresaIdForm) {
      setVinculoError('Selecione a empresa contratante para vínculo dedicado.')
      return
    }

    const motObj = motoristas.find(m => m.id === motoristaIdForm)

    setSubmittingVinculo(true)
    try {
      await contratosService.criarVinculoDedicado({
        empresa_id: categoriaForm === 'DEDICADO' ? empresaIdForm : undefined,
        motorista_id: motoristaIdForm,
        veiculo_id: veiculoParaVinculo.id,
        tipo_veiculo: veiculoParaVinculo.tipo_veiculo,
        categoria_operacional: categoriaForm,
        categoria: categoriaForm,
      })
      toast.success(
        `Motorista "${motObj?.nome || ''}" vinculado com sucesso ao veículo [${veiculoParaVinculo.placa}] (${categoriaForm})!`
      )
      setDrawerVinculoOpen(false)
      await carregarDados()
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Erro ao salvar vínculo do veículo.')
      setVinculoError(msg)
      toast.error(msg)
    } finally {
      setSubmittingVinculo(false)
    }
  }

  const handleDesvincular = async () => {
    if (!vinculoAtualVeiculo) return
    setSubmittingVinculo(true)
    setVinculoError(null)
    try {
      await contratosService.desativarVinculoDedicado(vinculoAtualVeiculo.id)
      toast.success(
        `Vínculo do veículo [${veiculoParaVinculo?.placa}] desativado com sucesso. Ele agora está livre sem motorista associado.`
      )
      setDrawerVinculoOpen(false)
      await carregarDados()
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Erro ao desvincular veículo.')
      setVinculoError(msg)
      toast.error(msg)
    } finally {
      setSubmittingVinculo(false)
    }
  }

  const getMotoristaVinculado = (veiculoId: string) => {
    const vinculo = vinculos.find(v => v.veiculo_id === veiculoId && v.ativo)
    if (!vinculo) return null
    return motoristas.find(m => m.id === vinculo.motorista_id)
  }

  const veiculosFiltrados = veiculos.filter(v => {
    const matchesPlaca =
      v.placa.toLowerCase().includes(searchPlaca.toLowerCase()) ||
      (v.identificacao ? v.identificacao.toLowerCase().includes(searchPlaca.toLowerCase()) : false)
    const matchesTipo = !filtroTipo || v.tipo_veiculo === filtroTipo
    const matchesEsp = !filtroEspecialidade || v.especialidade === filtroEspecialidade
    return matchesPlaca && matchesTipo && matchesEsp
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Veículos"
        subtitle="Cadastro e controle da frota física de veículos operacionais"
        actions={
          <Button variant="primary" onClick={handleOpenNovo} leftIcon={<Plus className="w-4 h-4" />}>
            Novo Veículo
          </Button>
        }
      />

      {error && <Alert type="error">{error}</Alert>}

      <FilterBar
        hasActiveFilters={!!(searchPlaca || filtroTipo || filtroEspecialidade)}
        onClearFilters={() => {
          setSearchPlaca('')
          setFiltroTipo('')
          setFiltroEspecialidade('')
        }}
      >
        <div className="flex flex-wrap items-center gap-3 w-full">
          <div className="w-72">
            <SearchInput
              value={searchPlaca}
              onChange={e => setSearchPlaca(e.target.value)}
              onClear={() => setSearchPlaca('')}
              placeholder="Buscar por placa..."
            />
          </div>

          <div className="w-44">
            <Select
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
              placeholder="Tipo de Veículo (Todos)"
              options={[
                { value: 'HR', label: 'HR' },
                { value: 'Fiorino', label: 'Fiorino' },
                { value: 'Truck', label: 'Truck' },
                { value: 'Toco', label: 'Toco' },
                { value: 'VUC', label: 'VUC' },
              ]}
            />
          </div>

          <div className="w-44">
            <Select
              value={filtroEspecialidade}
              onChange={e => setFiltroEspecialidade(e.target.value)}
              placeholder="Especialidade (Todas)"
              options={[
                { value: 'SECO', label: 'SECO' },
                { value: 'REFRIGERADO', label: 'REFRIGERADO' },
              ]}
            />
          </div>
        </div>
      </FilterBar>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : veiculosFiltrados.length === 0 ? (
        <EmptyState
          icon={<Truck className="w-12 h-12 text-slate-400" />}
          title="Nenhum veículo encontrado"
          description="Ajuste os filtros de busca ou cadastre um novo veículo na frota."
          action={
            <Button variant="outline" size="sm" onClick={handleOpenNovo}>
              Cadastrar Veículo
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeadCell>Placa</TableHeadCell>
              <TableHeadCell>Tipo de Veículo</TableHeadCell>
              <TableHeadCell>Especialidade</TableHeadCell>
              <TableHeadCell>Motorista Vinculado</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell className="text-right">Ações</TableHeadCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {veiculosFiltrados.map(v => {
              const motorista = getMotoristaVinculado(v.id)

              return (
                <TableRow key={v.id}>
                  <TableCell className="font-mono font-bold text-sky-700 text-sm">
                    {v.placa}
                  </TableCell>
                  <TableCell className="text-slate-700">{v.tipo_veiculo}</TableCell>
                  <TableCell>
                    <PerfilBadge perfil={v.especialidade} />
                  </TableCell>
                  <TableCell className="text-slate-700">
                    {motorista ? (
                      <span className="font-semibold text-emerald-700">{motorista.nome}</span>
                    ) : (
                      <span className="text-slate-400">Sem motorista vinculado</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={v.ativo ? 'ATIVO' : 'INATIVO'}
                      onClick={() => handleToggleStatus(v)}
                      title="Clique para alternar entre Ativo e Inativo"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenVinculo(v)}
                        leftIcon={<Link2 className="w-3.5 h-3.5" />}
                        title="Vincular ou alterar motorista deste veículo"
                      >
                        {motorista ? 'Alterar Motorista' : 'Vincular Motorista'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditar(v)}
                        leftIcon={<Edit className="w-3.5 h-3.5" />}
                      >
                        Editar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      {/* Drawer Vinculação de Motorista */}
      <Drawer
        isOpen={drawerVinculoOpen}
        onClose={() => setDrawerVinculoOpen(false)}
        title={vinculoAtualVeiculo ? 'Alterar Vínculo de Motorista' : 'Vincular Motorista ao Veículo'}
        subtitle={`Veículo: ${veiculoParaVinculo?.tipo_veiculo || ''} - [${veiculoParaVinculo?.placa || ''}]`}
        size="md"
      >
        <form onSubmit={handleSalvarVinculo} className="space-y-4">
          {vinculoError && <Alert type="error">{vinculoError}</Alert>}

          {vinculoAtualVeiculo && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-none text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sky-900">Vínculo Atual Ativo</span>
                <Badge variant={vinculoAtualVeiculo.categoria === 'DEDICADO' ? 'PROGRAMADO' : 'EM_BREVE'}>
                  {vinculoAtualVeiculo.categoria || vinculoAtualVeiculo.categoria_operacional || 'SPOT'}
                </Badge>
              </div>
              <div className="text-slate-700">
                Motorista:{' '}
                <strong>
                  {motoristas.find(m => m.id === vinculoAtualVeiculo.motorista_id)?.nome || 'Motorista'}
                </strong>
              </div>
              <div className="pt-2 border-t border-sky-200 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleDesvincular}
                  disabled={submittingVinculo}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-300"
                  leftIcon={<Unlink className="w-3.5 h-3.5" />}
                >
                  Desvincular Motorista Atual
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Categoria Operacional:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCategoriaForm('SPOT')}
                className={`py-2 px-3 text-xs font-semibold border text-center transition-colors ${
                  categoriaForm === 'SPOT'
                    ? 'bg-sky-50 border-sky-600 text-sky-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                SPOT (Recurso Livre)
              </button>
              <button
                type="button"
                onClick={() => setCategoriaForm('DEDICADO')}
                className={`py-2 px-3 text-xs font-semibold border text-center transition-colors ${
                  categoriaForm === 'DEDICADO'
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                DEDICADO (Empresa)
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              {categoriaForm === 'SPOT'
                ? 'Recurso operacional livre, não associado a contrato fixo de empresa.'
                : 'Recurso alocado exclusivamente para atendimento a uma empresa parceira.'}
            </p>
          </div>

          {categoriaForm === 'DEDICADO' && (
            <Select
              label="Empresa Parceira / Contratante"
              value={empresaIdForm}
              onChange={e => setEmpresaIdForm(e.target.value)}
              options={empresas.map(e => ({ value: e.id, label: `${e.nome} (${e.identificacao})` }))}
              required
            />
          )}

          <Select
            label="Motorista (Operadores Disponíveis)"
            value={motoristaIdForm}
            onChange={e => setMotoristaIdForm(e.target.value)}
            placeholder="Selecione o motorista..."
            options={motoristasDisponiveisParaVinculo.map(m => ({
              value: m.id,
              label: m.nome,
            }))}
            required
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDrawerVinculoOpen(false)}
              type="button"
              disabled={submittingVinculo}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={submittingVinculo}
              type="submit"
            >
              Salvar Vínculo
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Drawer Cadastro/Edição */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedVeiculo ? 'Editar Veículo' : 'Cadastrar Novo Veículo'}
        subtitle="Informe a placa e características técnicas do veículo"
      >
        <form onSubmit={handleSalvar} className="space-y-4">
          {formError && <Alert type="error">{formError}</Alert>}

          <Input
            label="Placa (7 Caracteres)"
            value={placaForm}
            onChange={e => setPlacaForm(e.target.value.toUpperCase())}
            placeholder="Ex: ABC1D23"
            maxLength={7}
            required
          />

          <Select
            label="Tipo de Veículo"
            value={tipoForm}
            onChange={e => setTipoForm(e.target.value)}
            options={[
              { value: 'HR', label: 'HR' },
              { value: 'Fiorino', label: 'Fiorino' },
              { value: 'Truck', label: 'Truck' },
              { value: 'Toco', label: 'Toco' },
              { value: 'VUC', label: 'VUC' },
            ]}
            required
          />

          <Select
            label="Especialidade"
            value={especialidadeForm}
            onChange={e => setEspecialidadeForm(e.target.value as EspecialidadeVeiculo)}
            options={[
              { value: 'SECO', label: 'SECO' },
              { value: 'REFRIGERADO', label: 'REFRIGERADO' },
            ]}
            required
          />

          {selectedVeiculo && (
            <div className="flex items-center gap-3 pt-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Status no Sistema:
              </label>
              <button
                type="button"
                onClick={() => setAtivoForm(!ativoForm)}
                className={`px-3 py-1 text-xs font-semibold rounded-none transition-colors border ${
                  ativoForm
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-rose-50 text-rose-700 border-rose-300'
                }`}
              >
                {ativoForm ? 'Veículo Ativo' : 'Veículo Inativo'}
              </button>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="primary" size="sm" isLoading={submitting} type="submit">
              Salvar Veículo
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  )
}

