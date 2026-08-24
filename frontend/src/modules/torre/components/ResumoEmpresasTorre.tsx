import React from 'react'
import { ResumoEmpresaTorre } from '@/types/torre'
import { Card } from '@/components/ui/Card'
import { Table, TableHeader, TableBody, TableRow, TableHeadCell, TableCell } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Building2 } from 'lucide-react'

export interface ResumoEmpresasTorreProps {
  empresasResumo: ResumoEmpresaTorre[]
  isLoading: boolean
  onSelectEmpresa?: (empresaId: string) => void
  selectedEmpresaId?: string
}

export const ResumoEmpresasTorre: React.FC<ResumoEmpresasTorreProps> = ({
  empresasResumo,
  isLoading,
  onSelectEmpresa,
  selectedEmpresaId,
}) => {
  return (
    <Card
      title="Situação Operacional por Empresa"
      subtitle="Visualização agregada da capacidade contratada, utilização e status da frota alocada"
      className="bg-logtudo-surface/40 border-logtudo-border/60"
    >
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-10 bg-logtudo-surface/40 animate-pulse rounded-lg" />
          <div className="h-10 bg-logtudo-surface/40 animate-pulse rounded-lg" />
        </div>
      ) : empresasResumo.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400 bg-logtudo-deep/40 rounded-lg border border-dashed border-logtudo-border/60">
          Nenhuma empresa com programação registrada para esta data.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeadCell>Empresa Parceira</TableHeadCell>
              <TableHeadCell className="text-center">Contratados</TableHeadCell>
              <TableHeadCell className="text-center">Programados</TableHeadCell>
              <TableHeadCell className="text-center">Em Rota</TableHeadCell>
              <TableHeadCell className="text-center">Disponíveis</TableHeadCell>
              <TableHeadCell className="text-center">Indisponíveis</TableHeadCell>
              <TableHeadCell className="text-center">Vagas Abertas</TableHeadCell>
              <TableHeadCell>Composição de Frota</TableHeadCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empresasResumo.map(emp => {
              const isSelected = selectedEmpresaId === emp.empresa_id

              return (
                <TableRow
                  key={emp.empresa_id}
                  onClick={() => onSelectEmpresa && onSelectEmpresa(emp.empresa_id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-logtudo-primary/20 border-l-4 border-l-logtudo-accent' : 'hover:bg-logtudo-surface/60'
                  }`}
                >
                  <TableCell className="font-bold text-slate-100 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-logtudo-accent shrink-0" />
                    <span>{emp.empresa_nome}</span>
                  </TableCell>

                  <TableCell className="text-center font-mono font-bold text-slate-200">
                    {emp.contratados}
                  </TableCell>

                  <TableCell className="text-center font-mono text-blue-400 font-semibold">
                    {emp.programados}
                  </TableCell>

                  <TableCell className="text-center font-mono text-amber-400 font-semibold">
                    {emp.em_rota}
                  </TableCell>

                  <TableCell className="text-center font-mono text-emerald-400 font-semibold">
                    {emp.disponiveis}
                  </TableCell>

                  <TableCell className="text-center font-mono text-red-400 font-semibold">
                    {emp.indisponiveis}
                  </TableCell>

                  <TableCell className="text-center font-mono text-slate-400">
                    {emp.vagas_nao_preenchidas > 0 ? (
                      <span className="font-bold text-amber-400">{emp.vagas_nao_preenchidas}</span>
                    ) : (
                      '0'
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      {Object.entries(emp.regras_capacidade || {}).map(([tipo, qtd]) => (
                        <Badge key={tipo} variant="NEUTRO" size="sm">
                          {tipo}: {qtd}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}
