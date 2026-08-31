import React, { useEffect, useState, useCallback } from 'react'
import { veiculosService } from '@/services/veiculos/veiculosService'
import { contratosService } from '@/services/contratos/contratosService'
import { motoristasService } from '@/services/motoristas/motoristasService'
import { Veiculo, EspecialidadeVeiculo } from '@/types/veiculos'
import { MotoristaDedicadoVinculo } from '@/types/contratos'
import { Motorista } from '@/types/motoristas'
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
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Truck, Plus, Edit } from 'lucide-react'

export const VeiculosPage: React.FC = () => {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [vinculos, setVinculos] = useState<MotoristaDedicadoVinculo[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [searchPlaca, setSearchPlaca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroEspecialidade, setFiltroEspecialidade] = useState('')

  // Drawer Cadastro/Edição
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedVeiculo, setSelectedVeiculo] = useState<Veiculo | null>(null)
  const [identificacaoForm, setIdentificacaoForm] = useState('')
  const [placaForm, setPlacaForm] = useState('')
  const [tipoForm, setTipoForm] = useState('')
  const [especialidadeForm, setEspecialidadeForm] = useState<EspecialidadeVeiculo>('SECO')
  const [ativoForm, setAtivoForm] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const carregarDados = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [vList, vincList, mList] = await Promise.all([
        veiculosService.listar(),
        contratosService.listarVinculosAtivos().catch(() => []),
        motoristasService.listar().catch(() => []),
      ])
      setVeiculos(vList)
      setVinculos(vincList)
      setMotoristas(mList)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar lista de veículos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const handleOpenNovo = () => {
    setSelectedVeiculo(null)
    setIdentificacaoForm('')
    setPlacaForm('')
    setTipoForm('HR')
    setEspecialidadeForm('SECO')
    setAtivoForm(true)
    setFormError(null)
    setDrawerOpen(true)
  }

  const handleOpenEditar = (v: Veiculo) => {
    setSelectedVeiculo(v)
    setIdentificacaoForm(v.identificacao)
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

    if (!identificacaoForm.trim() || !tipoForm.trim()) {
      setFormError('Preencha todos os campos obrigatórios.')
      return
    }

    setSubmitting(true)
    try {
      if (selectedVeiculo) {
        await veiculosService.atualizar(selectedVeiculo.id, {
          identificacao: identificacaoForm.trim(),
          placa: placaClean,
          tipo_veiculo: tipoForm.trim(),
          especialidade: especialidadeForm,
          ativo: ativoForm,
        })
      } else {
        await veiculosService.criar({
          identificacao: identificacaoForm.trim(),
          placa: placaClean,
          tipo_veiculo: tipoForm.trim(),
          especialidade: especialidadeForm,
        })
      }
      setDrawerOpen(false)
      carregarDados()
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar dados do veículo.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (v: Veiculo) => {
    try {
      setError(null)
      await veiculosService.atualizar(v.id, {
        identificacao: v.identificacao,
        placa: v.placa,
        tipo_veiculo: v.tipo_veiculo,
        especialidade: v.especialidade,
        ativo: !v.ativo,
      })
      await carregarDados()
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar status do veículo.')
    }
  }

  const getMotoristaVinculado = (veiculoId: string) => {
    const vinculo = vinculos.find(v => v.veiculo_id === veiculoId && v.ativo)
    if (!vinculo) return null
    return motoristas.find(m => m.id === vinculo.motorista_id)
  }

  const veiculosFiltrados = veiculos.filter(v => {
    const matchesPlaca = v.placa.toLowerCase().includes(searchPlaca.toLowerCase()) || v.identificacao.toLowerCase().includes(searchPlaca.toLowerCase())
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
        <SearchInput
          value={searchPlaca}
          onChange={e => setSearchPlaca(e.target.value)}
          onClear={() => setSearchPlaca('')}
          placeholder="Buscar por placa ou identificação..."
        />

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
          className="w-44"
        />

        <Select
          value={filtroEspecialidade}
          onChange={e => setFiltroEspecialidade(e.target.value)}
          placeholder="Especialidade (Todas)"
          options={[
            { value: 'SECO', label: 'SECO' },
            { value: 'REFRIGERADO', label: 'REFRIGERADO' },
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
      ) : veiculosFiltrados.length === 0 ? (
        <EmptyState
          icon={<Truck className="w-12 h-12 text-slate-600" />}
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
              <TableHeadCell>Identificação Interna</TableHeadCell>
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
                  <TableCell className="font-mono font-bold text-sky-400 text-sm">
                    {v.placa}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-200">{v.identificacao}</TableCell>
                  <TableCell className="text-slate-300">{v.tipo_veiculo}</TableCell>
                  <TableCell>
                    <Badge variant={v.especialidade === 'REFRIGERADO' ? 'PROGRAMADO' : 'NEUTRO'}>
                      {v.especialidade}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {motorista ? (
                      <span className="font-semibold text-emerald-400">{motorista.nome}</span>
                    ) : (
                      <span className="text-slate-500">Sem motorista vinculado</span>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditar(v)}
                      leftIcon={<Edit className="w-3.5 h-3.5" />}
                    >
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

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

          <Input
            label="Identificação Interna / Prefixo"
            value={identificacaoForm}
            onChange={e => setIdentificacaoForm(e.target.value)}
            placeholder="Ex: HR-001"
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
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Status no Sistema:
              </label>
              <button
                type="button"
                onClick={() => setAtivoForm(!ativoForm)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  ativoForm
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-red-950 text-red-400 border border-red-800'
                }`}
              >
                {ativoForm ? 'Veículo Ativo' : 'Veículo Inativo'}
              </button>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
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
