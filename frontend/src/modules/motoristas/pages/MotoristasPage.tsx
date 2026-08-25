import React, { useEffect, useState, useCallback } from 'react'
import { motoristasService } from '@/services/motoristas/motoristasService'
import { contratosService } from '@/services/contratos/contratosService'
import { veiculosService } from '@/services/veiculos/veiculosService'
import { empresasService } from '@/services/empresas/empresasService'
import { Motorista } from '@/types/motoristas'
import { MotoristaDedicadoVinculo } from '@/types/contratos'
import { Veiculo } from '@/types/veiculos'
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
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ImportModal } from '@/components/ui/ImportModal'
import { UserCheck, Plus, Edit, Upload } from 'lucide-react'

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

  // Drawer Cadastro/Edição
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedMotorista, setSelectedMotorista] = useState<Motorista | null>(null)
  const [nomeForm, setNomeForm] = useState('')
  const [ativoForm, setAtivoForm] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const carregarDados = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [mList, vList, vecList, empList] = await Promise.all([
        motoristasService.listar(),
        contratosService.listarVinculosAtivos().catch(() => []),
        veiculosService.listar().catch(() => []),
        empresasService.listar().catch(() => []),
      ])
      setMotoristas(mList)
      setVinculos(vList)
      setVeiculos(vecList)
      setEmpresas(empList)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar lista de motoristas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const handleOpenNovo = () => {
    setSelectedMotorista(null)
    setNomeForm('')
    setAtivoForm(true)
    setFormError(null)
    setDrawerOpen(true)
  }

  const handleOpenEditar = (m: Motorista) => {
    setSelectedMotorista(m)
    setNomeForm(m.nome)
    setAtivoForm(m.ativo)
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

    setSubmitting(true)
    try {
      if (selectedMotorista) {
        await motoristasService.atualizar(selectedMotorista.id, {
          nome: nomeForm.trim(),
          ativo: ativoForm,
        })
      } else {
        await motoristasService.criar({ nome: nomeForm.trim() })
      }
      setDrawerOpen(false)
      carregarDados()
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar motorista.')
    } finally {
      setSubmitting(false)
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

    return matchesNome && matchesPlaca && matchesCat && matchesEsp
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
        hasActiveFilters={!!(searchNome || searchPlaca || filtroCategoria || filtroEspecialidade)}
        onClearFilters={() => {
          setSearchNome('')
          setSearchPlaca('')
          setFiltroCategoria('')
          setFiltroEspecialidade('')
        }}
      >
        <SearchInput
          value={searchNome}
          onChange={e => setSearchNome(e.target.value)}
          onClear={() => setSearchNome('')}
          placeholder="Buscar por nome..."
        />

        <SearchInput
          value={searchPlaca}
          onChange={e => setSearchPlaca(e.target.value)}
          onClear={() => setSearchPlaca('')}
          placeholder="Buscar por placa..."
        />

        <Select
          value={filtroCategoria}
          onChange={e => setFiltroCategoria(e.target.value)}
          placeholder="Categoria (Todas)"
          options={[
            { value: 'DEDICADO', label: 'DEDICADO' },
            { value: 'SPOT', label: 'SPOT' },
          ]}
          className="w-40"
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
      ) : motoristasFiltrados.length === 0 ? (
        <EmptyState
          icon={<UserCheck className="w-12 h-12 text-slate-600" />}
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
              <TableHeadCell>Status Operacional</TableHeadCell>
              <TableHeadCell className="text-right">Ações</TableHeadCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {motoristasFiltrados.map(m => {
              const info = getInfoVinculo(m.id)
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-semibold text-slate-100">{m.nome}</TableCell>
                  <TableCell>
                    <Badge variant={info.categoria === 'DEDICADO' ? 'PROGRAMADO' : 'EM_BREVE'}>
                      {info.categoria}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-300">{info.empresaNome}</TableCell>
                  <TableCell>
                    {info.veiculoPlaca !== '-' ? (
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="text-slate-400">{info.veiculoTipo}</span>
                        <span className="font-bold text-sky-400">[{info.veiculoPlaca}]</span>
                      </div>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-300">{info.especialidade}</TableCell>
                  <TableCell>
                    <StatusBadge status={m.ativo ? 'DISPONIVEL' : 'INDISPONIVEL'} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditar(m)}
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

      {/* Drawer Formulário */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedMotorista ? 'Editar Motorista' : 'Cadastrar Novo Motorista'}
        subtitle="Informe o nome completo do motorista"
      >
        <form onSubmit={handleSalvar} className="space-y-4">
          {formError && <Alert type="error">{formError}</Alert>}

          <Input
            label="Nome Completo do Motorista"
            value={nomeForm}
            onChange={e => setNomeForm(e.target.value)}
            placeholder="Ex: João da Silva"
            required
          />

          {selectedMotorista && (
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
                {ativoForm ? 'Motorista Ativo' : 'Motorista Inativo'}
              </button>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="primary" size="sm" isLoading={submitting} type="submit">
              Salvar Motorista
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
