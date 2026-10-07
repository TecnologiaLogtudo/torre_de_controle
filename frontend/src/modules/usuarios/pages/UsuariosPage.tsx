import React, { useEffect, useState, useCallback } from 'react'
import { usuariosService } from '@/services/usuarios/usuariosService'
import { Usuario } from '@/types/user'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/SearchInput'
import { FilterBar } from '@/components/ui/FilterBar'
import { Table, TableHeader, TableBody, TableRow, TableHeadCell, TableCell } from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDateBahia } from '@/utils/date'
import { toast } from '@/components/feedback/Toaster'
import { getErrorMessage } from '@/services/api/errors'
import { Users, Plus, Edit } from 'lucide-react'

export const UsuariosPage: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Drawer Cadastro/Edição
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null)
  const [nomeForm, setNomeForm] = useState('')
  const [emailForm, setEmailForm] = useState('')
  const [senhaForm, setSenhaForm] = useState('')
  const [ativoForm, setAtivoForm] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const carregarUsuarios = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await usuariosService.listar()
      setUsuarios(data)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erro ao carregar lista de usuários.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarUsuarios()
  }, [carregarUsuarios])

  const handleOpenNovo = () => {
    setSelectedUsuario(null)
    setNomeForm('')
    setEmailForm('')
    setSenhaForm('')
    setAtivoForm(true)
    setFormError(null)
    setDrawerOpen(true)
  }

  const handleOpenEditar = (u: Usuario) => {
    setSelectedUsuario(u)
    setNomeForm(u.nome)
    setEmailForm(u.email)
    setSenhaForm('')
    setAtivoForm(u.ativo)
    setFormError(null)
    setDrawerOpen(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!nomeForm.trim() || !emailForm.trim() || (!selectedUsuario && !senhaForm)) {
      setFormError('Preencha os campos obrigatórios.')
      return
    }

    setSubmitting(true)
    try {
      if (selectedUsuario) {
        await usuariosService.atualizar(selectedUsuario.id, {
          nome: nomeForm.trim(),
          email: emailForm.trim(),
          ativo: ativoForm,
        })
        toast.success(`Usuário "${nomeForm.trim()}" atualizado com sucesso!`)
      } else {
        await usuariosService.criar({
          nome: nomeForm.trim(),
          email: emailForm.trim(),
          senha: senhaForm,
          ativo: ativoForm,
        })
        toast.success(`Usuário "${nomeForm.trim()}" cadastrado com sucesso!`)
      }
      setDrawerOpen(false)
      carregarUsuarios()
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Erro ao salvar usuário.')
      setFormError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (u: Usuario) => {
    try {
      await usuariosService.atualizar(u.id, {
        ativo: !u.ativo,
      })
      toast.success(`Usuário "${u.nome}" ${!u.ativo ? 'ativado' : 'desativado'} com sucesso!`)
      carregarUsuarios()
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erro ao alterar status do usuário.'))
    }
  }

  const usuariosFiltrados = usuarios.filter(u =>
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Usuários"
        subtitle="Administração dos operadores e administradores do sistema"
        actions={
          <Button variant="primary" onClick={handleOpenNovo} leftIcon={<Plus className="w-4 h-4" />}>
            Novo Usuário
          </Button>
        }
      />

      {error && <Alert type="error">{error}</Alert>}

      <FilterBar
        hasActiveFilters={!!searchTerm}
        onClearFilters={() => setSearchTerm('')}
      >
        <div className="flex flex-wrap items-center gap-3 w-full">
          <div className="w-80">
            <SearchInput
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
              placeholder="Buscar por nome ou e-mail..."
            />
          </div>
        </div>
      </FilterBar>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : usuariosFiltrados.length === 0 ? (
        <EmptyState
          icon={<Users className="w-12 h-12 text-slate-400" />}
          title="Nenhum usuário encontrado"
          description="Nenhum operador corresponde aos critérios da busca."
          action={
            <Button variant="outline" size="sm" onClick={handleOpenNovo}>
              Cadastrar Operador
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeadCell>Nome do Operador</TableHeadCell>
              <TableHeadCell>E-mail de Acesso</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Data de Cadastro</TableHeadCell>
              <TableHeadCell className="text-right">Ação</TableHeadCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuariosFiltrados.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-semibold text-slate-900">{u.nome}</TableCell>
                <TableCell className="font-mono text-slate-600">{u.email}</TableCell>
                <TableCell>
                  <StatusBadge
                    status={u.ativo ? 'ATIVO' : 'INATIVO'}
                    onClick={() => handleToggleStatus(u)}
                    title="Clique para alternar entre Ativo e Inativo"
                  />
                </TableCell>
                <TableCell className="text-slate-500">
                  {formatDateBahia(u.criado_em)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEditar(u)}
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
        title={selectedUsuario ? 'Editar Usuário' : 'Cadastrar Novo Operador'}
        subtitle="Informe os dados de acesso do usuário no sistema"
      >
        <form onSubmit={handleSalvar} className="space-y-4">
          {formError && <Alert type="error">{formError}</Alert>}

          <Input
            label="Nome Completo"
            value={nomeForm}
            onChange={e => setNomeForm(e.target.value)}
            placeholder="Ex: Felipe Operador"
            required
          />

          <Input
            label="E-mail de Acesso"
            type="email"
            value={emailForm}
            onChange={e => setEmailForm(e.target.value)}
            placeholder="Ex: operador@logtudo.com.br"
            required
          />

          {!selectedUsuario && (
            <Input
              label="Senha de Acesso"
              type="password"
              value={senhaForm}
              onChange={e => setSenhaForm(e.target.value)}
              placeholder="••••••••"
              required
            />
          )}

          {selectedUsuario && (
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
                {ativoForm ? 'Usuário Ativo' : 'Usuário Inativo'}
              </button>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="primary" size="sm" isLoading={submitting} type="submit">
              Salvar Usuário
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  )
}

