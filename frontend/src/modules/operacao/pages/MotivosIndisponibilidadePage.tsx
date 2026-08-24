import React, { useEffect, useState, useCallback } from 'react'
import { motivosService } from '@/services/motivos/motivosService'
import { MotivoIndisponibilidade } from '@/types/motivos'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/SearchInput'
import { FilterBar } from '@/components/ui/FilterBar'
import { Table, TableHeader, TableBody, TableRow, TableHeadCell, TableCell } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ShieldCheck, Plus, Edit } from 'lucide-react'

export const MotivosIndisponibilidadePage: React.FC = () => {
  const [motivos, setMotivos] = useState<MotivoIndisponibilidade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Drawer Cadastro / Edição
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedMotivo, setSelectedMotivo] = useState<MotivoIndisponibilidade | null>(null)
  const [nomeForm, setNomeForm] = useState('')
  const [descricaoForm, setDescricaoForm] = useState('')
  const [ativoForm, setAtivoForm] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const carregarMotivos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await motivosService.listarMotivos(false)
      setMotivos(data)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar motivos de indisponibilidade.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarMotivos()
  }, [carregarMotivos])

  const handleOpenNovo = () => {
    setSelectedMotivo(null)
    setNomeForm('')
    setDescricaoForm('')
    setAtivoForm(true)
    setFormError(null)
    setDrawerOpen(true)
  }

  const handleOpenEditar = (m: MotivoIndisponibilidade) => {
    setSelectedMotivo(m)
    setNomeForm(m.nome)
    setDescricaoForm(m.descricao || '')
    setAtivoForm(m.ativo)
    setFormError(null)
    setDrawerOpen(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!nomeForm.trim()) {
      setFormError('Informe o nome do motivo.')
      return
    }

    setSubmitting(true)
    try {
      if (selectedMotivo) {
        await motivosService.atualizarMotivo(selectedMotivo.id, {
          nome: nomeForm.trim(),
          descricao: descricaoForm.trim() || null,
          ativo: ativoForm,
        })
      } else {
        await motivosService.criarMotivo({
          nome: nomeForm.trim(),
          descricao: descricaoForm.trim() || null,
        })
      }
      setDrawerOpen(false)
      carregarMotivos()
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar motivo de indisponibilidade.')
    } finally {
      setSubmitting(false)
    }
  }

  const motivosFiltrados = motivos.filter(m =>
    m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.descricao && m.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Motivos de Indisponibilidade"
        subtitle="Configuração de justificativas padronizadas para indisponibilidade operacional"
        actions={
          <Button variant="primary" onClick={handleOpenNovo} leftIcon={<Plus className="w-4 h-4" />}>
            Novo Motivo
          </Button>
        }
      />

      {error && <Alert type="error">{error}</Alert>}

      <FilterBar
        hasActiveFilters={!!searchTerm}
        onClearFilters={() => setSearchTerm('')}
      >
        <SearchInput
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onClear={() => setSearchTerm('')}
          placeholder="Buscar por nome ou descrição..."
        />
      </FilterBar>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : motivosFiltrados.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="w-12 h-12 text-slate-600" />}
          title="Nenhum motivo encontrado"
          description="Nenhum motivo de indisponibilidade cadastrado ou que corresponda à busca."
          action={
            <Button variant="outline" size="sm" onClick={handleOpenNovo}>
              Cadastrar Motivo
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeadCell>Nome do Motivo</TableHeadCell>
              <TableHeadCell>Descrição</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell className="text-right">Ação</TableHeadCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {motivosFiltrados.map(m => (
              <TableRow key={m.id}>
                <TableCell className="font-semibold text-slate-100">{m.nome}</TableCell>
                <TableCell className="text-slate-300">{m.descricao || '-'}</TableCell>
                <TableCell>
                  <Badge variant={m.ativo ? 'SUCESSO' : 'ERRO'}>
                    {m.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
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
            ))}
          </TableBody>
        </Table>
      )}

      {/* Drawer Cadastro/Edição */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedMotivo ? 'Editar Motivo' : 'Novo Motivo de Indisponibilidade'}
        subtitle="Informe a razão e descrição padronizada para indisponibilidade"
      >
        <form onSubmit={handleSalvar} className="space-y-4">
          {formError && <Alert type="error">{formError}</Alert>}

          <Input
            label="Nome do Motivo"
            value={nomeForm}
            onChange={e => setNomeForm(e.target.value)}
            placeholder="Ex: Manutenção Preventiva"
            required
          />

          <Input
            label="Descrição (Opcional)"
            value={descricaoForm}
            onChange={e => setDescricaoForm(e.target.value)}
            placeholder="Ex: Revisão periódica de oficina autorizada"
          />

          {selectedMotivo && (
            <div className="flex items-center gap-3 pt-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Status:
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
                {ativoForm ? 'Motivo Ativo' : 'Motivo Inativo'}
              </button>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="primary" size="sm" isLoading={submitting} type="submit">
              Salvar Motivo
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  )
}
