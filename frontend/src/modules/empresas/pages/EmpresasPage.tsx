import React, { useEffect, useState, useCallback } from 'react'
import { empresasService } from '@/services/empresas/empresasService'
import { contratosService } from '@/services/contratos/contratosService'
import { Empresa } from '@/types/empresas'
import { ContratoConfiguracao } from '@/types/contratos'
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
import { formatToBahia } from '@/utils/date'
import { Building2, Plus, Edit, Eye, History, FileText } from 'lucide-react'

export const EmpresasPage: React.FC = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Drawer de Cadastro / Edição
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null)
  const [nomeForm, setNomeForm] = useState('')
  const [identificacaoForm, setIdentificacaoForm] = useState('')
  const [ativoForm, setAtivoForm] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Drawer de Detalhes / Configurações Contratuais
  const [detalhesOpen, setDetalhesOpen] = useState(false)
  const [empresaDetalhe, setEmpresaDetalhe] = useState<Empresa | null>(null)
  const [historicoConfiguracoes, setHistoricoConfiguracoes] = useState<ContratoConfiguracao[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)

  const carregarEmpresas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await empresasService.listar()
      setEmpresas(data)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar lista de empresas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarEmpresas()
  }, [carregarEmpresas])

  const handleOpenNovaEmpresa = () => {
    setSelectedEmpresa(null)
    setNomeForm('')
    setIdentificacaoForm('')
    setAtivoForm(true)
    setFormError(null)
    setDrawerOpen(true)
  }

  const handleOpenEditarEmpresa = (emp: Empresa) => {
    setSelectedEmpresa(emp)
    setNomeForm(emp.nome)
    setIdentificacaoForm(emp.identificacao)
    setAtivoForm(emp.ativo)
    setFormError(null)
    setDrawerOpen(true)
  }

  const handleSalvarEmpresa = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!nomeForm.trim() || (!selectedEmpresa && !identificacaoForm.trim())) {
      setFormError('Preencha os campos obrigatórios.')
      return
    }

    setSubmitting(true)
    try {
      if (selectedEmpresa) {
        await empresasService.atualizar(selectedEmpresa.id, {
          nome: nomeForm.trim(),
          ativo: ativoForm,
        })
      } else {
        await empresasService.criar({
          nome: nomeForm.trim(),
          identificacao: identificacaoForm.trim(),
        })
      }
      setDrawerOpen(false)
      carregarEmpresas()
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar dados da empresa.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerDetalhes = async (emp: Empresa) => {
    setEmpresaDetalhe(emp)
    setDetalhesOpen(true)
    setLoadingHistorico(true)
    try {
      const configs = await contratosService.obterHistoricoConfiguracoes(emp.id)
      setHistoricoConfiguracoes(configs)
    } catch {
      setHistoricoConfiguracoes([])
    } finally {
      setLoadingHistorico(false)
    }
  }

  const empresasFiltradas = empresas.filter(emp =>
    emp.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.identificacao.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Empresas"
        subtitle="Cadastre e gerencie as empresas parceiras e contratantes operacionais"
        actions={
          <Button
            variant="primary"
            onClick={handleOpenNovaEmpresa}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Nova Empresa
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
          placeholder="Buscar por nome ou CNPJ/CPF..."
        />
      </FilterBar>

      {/* Lista de Empresas */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : empresasFiltradas.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-12 h-12 text-slate-600" />}
          title="Nenhuma empresa encontrada"
          description={
            searchTerm
              ? 'Nenhum resultado corresponde aos critérios da busca.'
              : 'Nenhuma empresa cadastrada no sistema ainda.'
          }
          action={
            <Button variant="outline" size="sm" onClick={handleOpenNovaEmpresa}>
              Cadastrar primeira empresa
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeadCell>Nome da Empresa</TableHeadCell>
              <TableHeadCell>Identificação (CNPJ/CPF)</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Data de Cadastro</TableHeadCell>
              <TableHeadCell className="text-right">Ações</TableHeadCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empresasFiltradas.map(emp => (
              <TableRow key={emp.id}>
                <TableCell className="font-semibold text-slate-100">{emp.nome}</TableCell>
                <TableCell className="font-mono text-slate-300">{emp.identificacao}</TableCell>
                <TableCell>
                  <Badge variant={emp.ativo ? 'SUCESSO' : 'ERRO'}>
                    {emp.ativo ? 'Ativa' : 'Inativa'}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-400">
                  {formatToBahia(emp.criado_em, { hour: undefined, minute: undefined, second: undefined })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVerDetalhes(emp)}
                      title="Ver detalhes e contratos"
                      leftIcon={<Eye className="w-3.5 h-3.5 text-sky-400" />}
                    >
                      Detalhes
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditarEmpresa(emp)}
                      leftIcon={<Edit className="w-3.5 h-3.5" />}
                    >
                      Editar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Drawer de Cadastro/Edição */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedEmpresa ? 'Editar Empresa' : 'Cadastrar Nova Empresa'}
        subtitle="Preencha as informações cadastrais da empresa"
      >
        <form onSubmit={handleSalvarEmpresa} className="space-y-4">
          {formError && <Alert type="error">{formError}</Alert>}

          <Input
            label="Razão Social / Nome Fantasia"
            value={nomeForm}
            onChange={e => setNomeForm(e.target.value)}
            placeholder="Ex: Transportadora Logtudo Ltda"
            required
          />

          <Input
            label="Identificação (CNPJ ou CPF)"
            value={identificacaoForm}
            onChange={e => setIdentificacaoForm(e.target.value)}
            placeholder="Apenas números ou com pontuação"
            disabled={!!selectedEmpresa}
            required
          />

          {selectedEmpresa && (
            <div className="flex items-center gap-3 pt-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Status Operacional:
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
                {ativoForm ? 'Empresa Ativa' : 'Empresa Inativa'}
              </button>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="primary" size="sm" isLoading={submitting} type="submit">
              {selectedEmpresa ? 'Atualizar Empresa' : 'Salvar Empresa'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Drawer de Detalhes e Configuração Contratual */}
      <Drawer
        isOpen={detalhesOpen}
        onClose={() => setDetalhesOpen(false)}
        title={empresaDetalhe?.nome || 'Detalhes da Empresa'}
        subtitle={`Identificação: ${empresaDetalhe?.identificacao || ''}`}
        size="lg"
      >
        <div className="space-y-6">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Informações Cadastrais
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Status:</span>
                <Badge variant={empresaDetalhe?.ativo ? 'SUCESSO' : 'ERRO'}>
                  {empresaDetalhe?.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <div>
                <span className="text-slate-500 block">Cadastrado em:</span>
                <span className="text-slate-200 font-mono">
                  {formatToBahia(empresaDetalhe?.criado_em)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-sky-400" />
              Histórico de Capacidade Contratual
            </h4>

            {loadingHistorico ? (
              <Skeleton className="h-20 w-full" />
            ) : historicoConfiguracoes.length === 0 ? (
              <div className="text-xs text-slate-400 p-4 bg-slate-950 rounded-lg border border-slate-800 text-center">
                Nenhuma configuração de capacidade registrada para esta empresa ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {historicoConfiguracoes.map((config, index) => (
                  <div
                    key={config.id}
                    className={`p-4 rounded-lg border ${
                      index === 0
                        ? 'bg-sky-950/40 border-sky-800/80'
                        : 'bg-slate-950/60 border-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-sky-400" />
                        <span className="text-xs font-bold text-slate-100">
                          {index === 0 ? 'Configuração Vigente' : `Histórico #${historicoConfiguracoes.length - index}`}
                        </span>
                      </div>
                      <Badge variant={index === 0 ? 'SUCESSO' : 'EM_BREVE'}>
                        {index === 0 ? 'Vigente' : 'Encerrada'}
                      </Badge>
                    </div>

                    <div className="text-xs text-slate-400 mb-3">
                      <span>Vigência: </span>
                      <span className="font-mono text-slate-200">
                        {formatToBahia(config.data_inicio, { hour: undefined, minute: undefined, second: undefined })}
                        {config.data_fim ? ` até ${formatToBahia(config.data_fim, { hour: undefined, minute: undefined, second: undefined })}` : ' em diante'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
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
                        <div key={cIdx} className="bg-slate-900 p-2 rounded border border-slate-800 text-[11px]">
                          <span className="font-bold text-slate-200 block">{cap.tipo_veiculo}</span>
                          <span className="text-slate-400">{cap.especialidade} — </span>
                          <span className="font-bold text-sky-400">{cap.quantidade} vagas</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Drawer>
    </div>
  )
}
