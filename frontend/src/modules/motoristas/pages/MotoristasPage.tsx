import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { motoristasService } from '@/services/motoristas/motoristasService'
import { contratosService } from '@/services/contratos/contratosService'
import { veiculosService } from '@/services/veiculos/veiculosService'
import { empresasService } from '@/services/empresas/empresasService'
import { Motorista } from '@/types/motoristas'
import { MotoristaDedicadoVinculo } from '@/types/contratos'
import { Veiculo, EspecialidadeVeiculo } from '@/types/veiculos'
import { Empresa } from '@/types/empresas'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/SearchInput'
import { FilterBar } from '@/components/ui/FilterBar'
import { Select } from '@/components/ui/Select'
import { Table, TableHeader, TableBody, TableRow, TableHeadCell, TableCell } from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Badge } from '@/components/ui/Badge'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ImportModal } from '@/components/ui/ImportModal'
import { toast } from '@/components/feedback/Toaster'
import { getErrorMessage } from '@/services/api/errors'
import { UserCheck, Plus, Edit, Upload, Link2, Unlink, Truck } from 'lucide-react'

export const MotoristasPage: React.FC = () => {
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [vinculos, setVinculos] = useState<MotoristaDedicadoVinculo[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal de Importação
  const [importModalOpen, setImportModalOpen] = useState(false)

  // Filtros
  const [searchNome, setSearchNome] = useState('')
  const [searchPlaca, setSearchPlaca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroEspecialidade, setFiltroEspecialidade] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS')

  // Drawer Cadastro/Edição com Cadastro Casado
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedMotorista, setSelectedMotorista] = useState<Motorista | null>(null)
  const [nomeForm, setNomeForm] = useState('')
  const [ativoForm, setAtivoForm] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Vínculo Casado no Drawer de Cadastro/Edição
  const [modoVinculoForm, setModoVinculoForm] = useState<'nenhum' | 'existente' | 'novo'>('nenhum')
  const [veiculoIdVinculoForm, setVeiculoIdVinculoForm] = useState('')
  const [novoVeiculoPlaca, setNovoVeiculoPlaca] = useState('')
  const [novoVeiculoTipo, setNovoVeiculoTipo] = useState('HR')
  const [novoVeiculoEspecialidade, setNovoVeiculoEspecialidade] = useState<EspecialidadeVeiculo>('SECO')
  const [categoriaVinculoForm, setCategoriaVinculoForm] = useState<'SPOT' | 'DEDICADO'>('SPOT')
  const [empresaIdVinculoForm, setEmpresaIdVinculoForm] = useState('')
  const [vinculoOriginal, setVinculoOriginal] = useState<MotoristaDedicadoVinculo | null>(null)

  // Drawer Vinculação Rápida de Veículo
  const [drawerVinculoOpen, setDrawerVinculoOpen] = useState(false)
  const [motoristaParaVinculo, setMotoristaParaVinculo] = useState<Motorista | null>(null)
  const [vinculoAtualMotorista, setVinculoAtualMotorista] = useState<MotoristaDedicadoVinculo | null>(null)
  const [veiculoIdForm, setVeiculoIdForm] = useState('')
  const [categoriaForm, setCategoriaForm] = useState<'SPOT' | 'DEDICADO'>('SPOT')
  const [empresaIdForm, setEmpresaIdForm] = useState('')
  const [submittingVinculo, setSubmittingVinculo] = useState(false)
  const [vinculoError, setVinculoError] = useState<string | null>(null)

  const carregarDados = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [mList, vList, vecList, empList] = await Promise.all([
        motoristasService.listar(1000),
        contratosService.listarVinculosAtivos(1000).catch(() => []),
        veiculosService.listar(1000).catch(() => []),
        empresasService.listar().catch(() => []),
      ])
      setMotoristas(mList)
      setVinculos(vList)
      setVeiculos(vecList)
      setEmpresas(empList)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erro ao carregar lista de motoristas.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const veiculosDisponiveisParaCadastro = useMemo(() => {
    const veiculosOcupadosPorOutros = new Set(
      vinculos
        .filter(v => v.ativo && v.veiculo_id && v.motorista_id !== selectedMotorista?.id)
        .map(v => v.veiculo_id)
    )
    return veiculos.filter(v => v.ativo && !veiculosOcupadosPorOutros.has(v.id))
  }, [veiculos, vinculos, selectedMotorista])

  const handleOpenNovo = () => {
    setSelectedMotorista(null)
    setNomeForm('')
    setAtivoForm(true)
    setModoVinculoForm('nenhum')
    setVeiculoIdVinculoForm('')
    setNovoVeiculoPlaca('')
    setNovoVeiculoTipo('HR')
    setNovoVeiculoEspecialidade('SECO')
    setCategoriaVinculoForm('SPOT')
    setEmpresaIdVinculoForm(empresas.length > 0 ? empresas[0].id : '')
    setVinculoOriginal(null)
    setFormError(null)
    setDrawerOpen(true)
  }

  const handleOpenEditar = (m: Motorista) => {
    setSelectedMotorista(m)
    setNomeForm(m.nome)
    setAtivoForm(m.ativo)
    const vinc = vinculos.find(v => v.motorista_id === m.id && v.ativo) || null
    setVinculoOriginal(vinc)

    if (vinc) {
      setModoVinculoForm('existente')
      setVeiculoIdVinculoForm(vinc.veiculo_id || '')
      setCategoriaVinculoForm((vinc.categoria || vinc.categoria_operacional || 'SPOT') as 'SPOT' | 'DEDICADO')
      setEmpresaIdVinculoForm(vinc.empresa_id || (empresas.length > 0 ? empresas[0].id : ''))
    } else {
      setModoVinculoForm('nenhum')
      setVeiculoIdVinculoForm('')
      setCategoriaVinculoForm('SPOT')
      setEmpresaIdVinculoForm(empresas.length > 0 ? empresas[0].id : '')
    }

    setNovoVeiculoPlaca('')
    setNovoVeiculoTipo('HR')
    setNovoVeiculoEspecialidade('SECO')
    setFormError(null)
    setDrawerOpen(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!nomeForm.trim()) {
      setFormError('Por favor, informe o nome do motorista.')
      return
    }

    let cleanPlaca = ''
    if (modoVinculoForm === 'novo') {
      cleanPlaca = novoVeiculoPlaca.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
      if (cleanPlaca.length !== 7) {
        setFormError('A placa do novo veículo deve conter exatamente 7 caracteres alfanuméricos (Mercosul ou tradicional).')
        return
      }
      if (!novoVeiculoTipo.trim()) {
        setFormError('Selecione o tipo do novo veículo.')
        return
      }
      if (categoriaVinculoForm === 'DEDICADO' && !empresaIdVinculoForm) {
        setFormError('Selecione a empresa contratante para vínculo dedicado.')
        return
      }
    } else if (modoVinculoForm === 'existente') {
      if (!veiculoIdVinculoForm) {
        setFormError('Selecione um veículo físico para vincular ao motorista.')
        return
      }
      if (categoriaVinculoForm === 'DEDICADO' && !empresaIdVinculoForm) {
        setFormError('Selecione a empresa contratante para vínculo dedicado.')
        return
      }
    }

    setSubmitting(true)
    try {
      let motId: string
      if (selectedMotorista) {
        await motoristasService.atualizar(selectedMotorista.id, {
          nome: nomeForm.trim(),
          ativo: ativoForm,
        })
        motId = selectedMotorista.id
      } else {
        const created = await motoristasService.criar({ nome: nomeForm.trim() })
        motId = created.id
      }

      if (modoVinculoForm === 'novo') {
        const createdVeic = await veiculosService.criar({
          placa: cleanPlaca,
          tipo_veiculo: novoVeiculoTipo.trim(),
          especialidade: novoVeiculoEspecialidade,
        })
        if (vinculoOriginal) {
          await contratosService.desativarVinculoDedicado(vinculoOriginal.id)
        }
        await contratosService.criarVinculoDedicado({
          empresa_id: categoriaVinculoForm === 'DEDICADO' ? empresaIdVinculoForm : undefined,
          motorista_id: motId,
          veiculo_id: createdVeic.id,
          tipo_veiculo: createdVeic.tipo_veiculo,
          categoria_operacional: categoriaVinculoForm,
          categoria: categoriaVinculoForm,
        })
        toast.success(
          `Motorista "${nomeForm.trim()}" e veículo [${cleanPlaca}] cadastrados e vinculados com sucesso!`
        )
      } else if (modoVinculoForm === 'existente') {
        const mudouVeiculo = vinculoOriginal?.veiculo_id !== veiculoIdVinculoForm
        const mudouCat = (vinculoOriginal?.categoria || vinculoOriginal?.categoria_operacional) !== categoriaVinculoForm
        const mudouEmp =
          (vinculoOriginal?.empresa_id || '') !==
          (categoriaVinculoForm === 'DEDICADO' ? empresaIdVinculoForm : '')

        if (!vinculoOriginal || mudouVeiculo || mudouCat || mudouEmp) {
          if (vinculoOriginal) {
            await contratosService.desativarVinculoDedicado(vinculoOriginal.id)
          }
          const veicObj = veiculos.find(v => v.id === veiculoIdVinculoForm)
          await contratosService.criarVinculoDedicado({
            empresa_id: categoriaVinculoForm === 'DEDICADO' ? empresaIdVinculoForm : undefined,
            motorista_id: motId,
            veiculo_id: veiculoIdVinculoForm,
            tipo_veiculo: veicObj?.tipo_veiculo,
            categoria_operacional: categoriaVinculoForm,
            categoria: categoriaVinculoForm,
          })
        }
        toast.success(`Motorista "${nomeForm.trim()}" salvo com sucesso com veículo vinculado!`)
      } else {
        // modoVinculoForm === 'nenhum'
        if (vinculoOriginal) {
          await contratosService.desativarVinculoDedicado(vinculoOriginal.id)
        }
        toast.success(`Motorista "${nomeForm.trim()}" salvo com sucesso!`)
      }

      setDrawerOpen(false)
      await carregarDados()
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Erro ao salvar motorista.')
      setFormError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (m: Motorista) => {
    try {
      setError(null)
      const novoStatus = !m.ativo
      await motoristasService.atualizar(m.id, {
        nome: m.nome,
        ativo: novoStatus,
      })
      toast.success(`Motorista "${m.nome}" ${novoStatus ? 'ativado' : 'inativado'} com sucesso.`)
      await carregarDados()
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Erro ao alterar status do motorista.')
      setError(msg)
      toast.error(msg)
    }
  }

  const handleOpenVinculo = (m: Motorista) => {
    setMotoristaParaVinculo(m)
    const vinc = vinculos.find(v => v.motorista_id === m.id && v.ativo) || null
    setVinculoAtualMotorista(vinc)
    setVeiculoIdForm(vinc?.veiculo_id || '')
    const cat = (vinc?.categoria || vinc?.categoria_operacional || 'SPOT') as 'SPOT' | 'DEDICADO'
    setCategoriaForm(cat)
    setEmpresaIdForm(vinc?.empresa_id || (empresas.length > 0 ? empresas[0].id : ''))
    setVinculoError(null)
    setDrawerVinculoOpen(true)
  }

  const veiculosDisponiveisParaVinculo = useMemo(() => {
    const veiculosOcupadosPorOutros = new Set(
      vinculos
        .filter(v => v.ativo && v.veiculo_id && v.motorista_id !== motoristaParaVinculo?.id)
        .map(v => v.veiculo_id)
    )
    return veiculos.filter(v => v.ativo && !veiculosOcupadosPorOutros.has(v.id))
  }, [veiculos, vinculos, motoristaParaVinculo])

  const handleSalvarVinculo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!motoristaParaVinculo) return
    setVinculoError(null)

    if (!veiculoIdForm) {
      setVinculoError('Selecione um veículo físico para vincular ao motorista.')
      return
    }

    if (categoriaForm === 'DEDICADO' && !empresaIdForm) {
      setVinculoError('Selecione a empresa contratante para vínculo dedicado.')
      return
    }

    const veiculoObj = veiculos.find(v => v.id === veiculoIdForm)

    setSubmittingVinculo(true)
    try {
      await contratosService.criarVinculoDedicado({
        empresa_id: categoriaForm === 'DEDICADO' ? empresaIdForm : undefined,
        motorista_id: motoristaParaVinculo.id,
        veiculo_id: veiculoIdForm,
        tipo_veiculo: veiculoObj?.tipo_veiculo,
        categoria_operacional: categoriaForm,
        categoria: categoriaForm,
      })
      toast.success(
        `Veículo [${veiculoObj?.placa || ''}] vinculado com sucesso ao motorista "${motoristaParaVinculo.nome}" (${categoriaForm})!`
      )
      setDrawerVinculoOpen(false)
      await carregarDados()
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Erro ao salvar vínculo do motorista.')
      setVinculoError(msg)
      toast.error(msg)
    } finally {
      setSubmittingVinculo(false)
    }
  }

  const handleDesvincular = async () => {
    if (!vinculoAtualMotorista) return
    setSubmittingVinculo(true)
    setVinculoError(null)
    try {
      await contratosService.desativarVinculoDedicado(vinculoAtualMotorista.id)
      toast.success(
        `Vínculo do motorista "${motoristaParaVinculo?.nome}" desativado com sucesso. Ele agora é um recurso SPOT livre sem veículo.`
      )
      setDrawerVinculoOpen(false)
      await carregarDados()
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Erro ao desvincular motorista.')
      setVinculoError(msg)
      toast.error(msg)
    } finally {
      setSubmittingVinculo(false)
    }
  }

  // Mapeamento auxiliar do vínculo dedicado
  const getInfoVinculo = (motoristaId: string) => {
    const vinculo = vinculos.find(v => v.motorista_id === motoristaId && v.ativo)
    if (!vinculo) {
      return {
        categoria: 'SPOT',
        veiculoPlaca: '-',
        veiculoTipo: '-',
        especialidade: '-',
        empresaNome: 'Recurso SPOT Livre',
      }
    }

    const veiculo = veiculos.find(v => v.id === vinculo.veiculo_id)
    const empresa = vinculo.empresa_id ? empresas.find(e => e.id === vinculo.empresa_id) : null
    const categoria = vinculo.categoria || vinculo.categoria_operacional || (vinculo.empresa_id ? 'DEDICADO' : 'SPOT')

    return {
      categoria,
      veiculoPlaca: veiculo?.placa || 'Sem placa',
      veiculoTipo: veiculo?.tipo_veiculo || '-',
      especialidade: veiculo?.especialidade || '-',
      empresaNome: empresa?.nome || (categoria === 'SPOT' ? 'Recurso SPOT Livre' : 'Empresa Parceira'),
    }
  }

  const motoristasFiltrados = motoristas.filter(m => {
    const info = getInfoVinculo(m.id)

    const matchesNome = m.nome.toLowerCase().includes(searchNome.toLowerCase())
    const matchesPlaca = info.veiculoPlaca.toLowerCase().includes(searchPlaca.toLowerCase())
    const matchesCat = !filtroCategoria || info.categoria === filtroCategoria
    const matchesEsp = !filtroEspecialidade || info.especialidade === filtroEspecialidade
    const matchesStatus =
      filtroStatus === 'TODOS' ? true : filtroStatus === 'ATIVO' ? m.ativo : !m.ativo

    return matchesNome && matchesPlaca && matchesCat && matchesEsp && matchesStatus
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Motoristas"
        subtitle="Controle e cadastro da frota de motoristas operacionais (Dedicados e SPOT)"
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setImportModalOpen(true)} leftIcon={<Upload className="w-4 h-4" />}>
              Importar Planilha
            </Button>
            <Button variant="primary" onClick={handleOpenNovo} leftIcon={<Plus className="w-4 h-4" />}>
              Novo Motorista
            </Button>
          </div>
        }
      />

      {error && <Alert type="error">{error}</Alert>}

      <FilterBar
        hasActiveFilters={!!(searchNome || searchPlaca || filtroCategoria || filtroEspecialidade || filtroStatus !== 'TODOS')}
        onClearFilters={() => {
          setSearchNome('')
          setSearchPlaca('')
          setFiltroCategoria('')
          setFiltroEspecialidade('')
          setFiltroStatus('TODOS')
        }}
      >
        <div className="flex flex-wrap items-center gap-3 w-full">
          <div className="w-56">
            <SearchInput
              value={searchNome}
              onChange={e => setSearchNome(e.target.value)}
              onClear={() => setSearchNome('')}
              placeholder="Buscar por nome..."
            />
          </div>

          <div className="w-48">
            <SearchInput
              value={searchPlaca}
              onChange={e => setSearchPlaca(e.target.value)}
              onClear={() => setSearchPlaca('')}
              placeholder="Buscar por placa..."
            />
          </div>

          <div className="w-40">
            <Select
              value={filtroCategoria}
              onChange={e => setFiltroCategoria(e.target.value)}
              placeholder="Categoria (Todas)"
              options={[
                { value: 'DEDICADO', label: 'DEDICADO' },
                { value: 'SPOT', label: 'SPOT' },
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

          <div className="w-40">
            <Select
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value)}
              placeholder="Status (Todos)"
              options={[
                { value: 'TODOS', label: 'Status (Todos)' },
                { value: 'ATIVO', label: 'Apenas Ativos' },
                { value: 'INATIVO', label: 'Apenas Inativos' },
              ]}
            />
          </div>
        </div>
      </FilterBar>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : motoristasFiltrados.length === 0 ? (
        <EmptyState
          icon={<UserCheck className="w-12 h-12 text-slate-400" />}
          title="Nenhum motorista encontrado"
          description="Ajuste os filtros de pesquisa ou cadastre um novo motorista no sistema."
          action={
            <Button variant="outline" size="sm" onClick={handleOpenNovo}>
              Cadastrar Motorista
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeadCell>Nome do Motorista</TableHeadCell>
              <TableHeadCell>Categoria</TableHeadCell>
              <TableHeadCell>Empresa Vinculada</TableHeadCell>
              <TableHeadCell>Veículo / Placa</TableHeadCell>
              <TableHeadCell>Especialidade</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell className="text-right">Ações</TableHeadCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {motoristasFiltrados.map(m => {
              const info = getInfoVinculo(m.id)
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-semibold text-slate-900">{m.nome}</TableCell>
                  <TableCell>
                    <Badge variant={info.categoria === 'DEDICADO' ? 'PROGRAMADO' : 'EM_BREVE'}>
                      {info.categoria}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600">{info.empresaNome}</TableCell>
                  <TableCell>
                    {info.veiculoPlaca !== '-' ? (
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="text-slate-600">{info.veiculoTipo}</span>
                        <span className="font-bold text-sky-700">[{info.veiculoPlaca}]</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600">{info.especialidade}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={m.ativo ? 'ATIVO' : 'INATIVO'}
                      onClick={() => handleToggleStatus(m)}
                      title="Clique para alternar entre Ativo e Inativo"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenVinculo(m)}
                        leftIcon={<Link2 className="w-3.5 h-3.5" />}
                        title="Vincular ou alterar veículo deste motorista"
                      >
                        {info.veiculoPlaca !== '-' ? 'Alterar Veículo' : 'Vincular Veículo'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditar(m)}
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

      {/* Drawer Vinculação Rápida de Veículo */}
      <Drawer
        isOpen={drawerVinculoOpen}
        onClose={() => setDrawerVinculoOpen(false)}
        title={vinculoAtualMotorista ? 'Alterar Vínculo de Veículo' : 'Vincular Veículo ao Motorista'}
        subtitle={`Motorista: ${motoristaParaVinculo?.nome || ''}`}
        size="md"
      >
        <form onSubmit={handleSalvarVinculo} className="space-y-4">
          {vinculoError && <Alert type="error">{vinculoError}</Alert>}

          {vinculoAtualMotorista && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-none text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sky-900">Vínculo Atual Ativo</span>
                <Badge variant={vinculoAtualMotorista.categoria === 'DEDICADO' ? 'PROGRAMADO' : 'EM_BREVE'}>
                  {vinculoAtualMotorista.categoria || vinculoAtualMotorista.categoria_operacional || 'SPOT'}
                </Badge>
              </div>
              <div className="text-slate-700">
                Veículo:{' '}
                <strong>
                  {veiculos.find(v => v.id === vinculoAtualMotorista.veiculo_id)?.placa || 'Sem placa'}
                </strong>{' '}
                ({veiculos.find(v => v.id === vinculoAtualMotorista.veiculo_id)?.tipo_veiculo || '-'})
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
                  Desvincular Veículo Atual
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
            label="Veículo Físico (Frota Disponível)"
            value={veiculoIdForm}
            onChange={e => setVeiculoIdForm(e.target.value)}
            placeholder="Selecione o veículo..."
            options={veiculosDisponiveisParaVinculo.map(v => ({
              value: v.id,
              label: `[${v.placa}] ${v.tipo_veiculo}${v.identificacao && v.identificacao !== v.placa ? ` - ${v.identificacao}` : ''} (${v.especialidade})`,
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

      {/* Drawer Cadastro/Edição com Cadastro Casado */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedMotorista ? 'Editar Motorista' : 'Cadastrar Novo Motorista'}
        subtitle="Informe o nome completo do motorista e configure o vínculo de veículo"
        size="lg"
      >
        <form onSubmit={handleSalvar} className="space-y-5">
          {formError && <Alert type="error">{formError}</Alert>}

          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              1. Identificação do Motorista
            </h4>
            <Input
              label="Nome Completo do Motorista"
              value={nomeForm}
              onChange={e => setNomeForm(e.target.value)}
              placeholder="Ex: João da Silva"
              required
            />

            {selectedMotorista && (
              <div className="flex items-center gap-3 pt-1">
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
                  {ativoForm ? 'Motorista Ativo' : 'Motorista Inativo'}
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-sky-600" />
                2. Vínculo de Veículo / Cadastro Casado
              </h4>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setModoVinculoForm('nenhum')}
                className={`py-2 px-2 text-xs font-semibold border text-center transition-colors ${
                  modoVinculoForm === 'nenhum'
                    ? 'bg-slate-100 border-slate-600 text-slate-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Sem Veículo
              </button>
              <button
                type="button"
                onClick={() => setModoVinculoForm('existente')}
                className={`py-2 px-2 text-xs font-semibold border text-center transition-colors ${
                  modoVinculoForm === 'existente'
                    ? 'bg-sky-50 border-sky-600 text-sky-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Vincular Existente
              </button>
              <button
                type="button"
                onClick={() => setModoVinculoForm('novo')}
                className={`py-2 px-2 text-xs font-semibold border text-center transition-colors ${
                  modoVinculoForm === 'novo'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                + Novo Veículo Casado
              </button>
            </div>

            {modoVinculoForm === 'nenhum' && (
              <div className="p-3 bg-slate-50 border border-slate-200 text-xs text-slate-600">
                O motorista será cadastrado como recurso operacional livre (SPOT) sem veículo físico associado no momento.
              </div>
            )}

            {modoVinculoForm === 'existente' && (
              <div className="space-y-3 p-3.5 bg-slate-50/80 border border-slate-200">
                <Select
                  label="Veículo Físico da Frota Disponível"
                  value={veiculoIdVinculoForm}
                  onChange={e => setVeiculoIdVinculoForm(e.target.value)}
                  placeholder="Selecione o veículo..."
                  options={veiculosDisponiveisParaCadastro.map(v => ({
                    value: v.id,
                    label: `[${v.placa}] ${v.tipo_veiculo}${v.identificacao && v.identificacao !== v.placa ? ` - ${v.identificacao}` : ''} (${v.especialidade})`,
                  }))}
                  required
                />

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Categoria da Operação:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCategoriaVinculoForm('SPOT')}
                      className={`py-1.5 px-3 text-xs font-semibold border text-center transition-colors ${
                        categoriaVinculoForm === 'SPOT'
                          ? 'bg-sky-50 border-sky-600 text-sky-800'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      SPOT (Recurso Livre)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoriaVinculoForm('DEDICADO')}
                      className={`py-1.5 px-3 text-xs font-semibold border text-center transition-colors ${
                        categoriaVinculoForm === 'DEDICADO'
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-800'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      DEDICADO (Empresa)
                    </button>
                  </div>
                </div>

                {categoriaVinculoForm === 'DEDICADO' && (
                  <Select
                    label="Empresa Contratante"
                    value={empresaIdVinculoForm}
                    onChange={e => setEmpresaIdVinculoForm(e.target.value)}
                    options={empresas.map(e => ({ value: e.id, label: `${e.nome} (${e.identificacao})` }))}
                    required
                  />
                )}
              </div>
            )}

            {modoVinculoForm === 'novo' && (
              <div className="space-y-3 p-3.5 bg-emerald-50/40 border border-emerald-200">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Placa do Veículo (7 Dígitos)"
                    value={novoVeiculoPlaca}
                    onChange={e => setNovoVeiculoPlaca(e.target.value.toUpperCase())}
                    placeholder="Ex: ABC1D23"
                    maxLength={7}
                    required
                  />
                  <Select
                    label="Tipo de Veículo"
                    value={novoVeiculoTipo}
                    onChange={e => setNovoVeiculoTipo(e.target.value)}
                    options={[
                      { value: 'HR', label: 'HR' },
                      { value: 'Fiorino', label: 'Fiorino' },
                      { value: 'Truck', label: 'Truck' },
                      { value: 'Toco', label: 'Toco' },
                      { value: 'VUC', label: 'VUC' },
                    ]}
                    required
                  />
                </div>

                <Select
                  label="Especialidade do Veículo"
                  value={novoVeiculoEspecialidade}
                  onChange={e => setNovoVeiculoEspecialidade(e.target.value as EspecialidadeVeiculo)}
                  options={[
                    { value: 'SECO', label: 'SECO' },
                    { value: 'REFRIGERADO', label: 'REFRIGERADO' },
                  ]}
                  required
                />

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Categoria da Operação:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCategoriaVinculoForm('SPOT')}
                      className={`py-1.5 px-3 text-xs font-semibold border text-center transition-colors ${
                        categoriaVinculoForm === 'SPOT'
                          ? 'bg-sky-50 border-sky-600 text-sky-800'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      SPOT (Recurso Livre)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoriaVinculoForm('DEDICADO')}
                      className={`py-1.5 px-3 text-xs font-semibold border text-center transition-colors ${
                        categoriaVinculoForm === 'DEDICADO'
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-800'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      DEDICADO (Empresa)
                    </button>
                  </div>
                </div>

                {categoriaVinculoForm === 'DEDICADO' && (
                  <Select
                    label="Empresa Contratante"
                    value={empresaIdVinculoForm}
                    onChange={e => setEmpresaIdVinculoForm(e.target.value)}
                    options={empresas.map(e => ({ value: e.id, label: `${e.nome} (${e.identificacao})` }))}
                    required
                  />
                )}
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="primary" size="sm" isLoading={submitting} type="submit">
              {selectedMotorista ? 'Salvar Alterações' : 'Cadastrar Motorista'}
            </Button>
          </div>
        </form>
      </Drawer>

      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={carregarDados}
      />
    </div>
  )
}
