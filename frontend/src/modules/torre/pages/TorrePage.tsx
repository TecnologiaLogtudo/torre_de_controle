import React, { useEffect, useState, useCallback } from 'react'
import { torreService } from '@/services/torre/torreService'
import { empresasService } from '@/services/empresas/empresasService'
import {
  ResumoTorre,
  ResumoEmpresaTorre,
  DetalhamentoOperacional,
  EventoOperacional,
  FiltrosDetalhamentoTorre,
} from '@/types/torre'
import { Empresa } from '@/types/empresas'
import { TorreHeader } from '../components/TorreHeader'
import { IndicadoresTorre } from '../components/IndicadoresTorre'
import { ResumoEmpresasTorre } from '../components/ResumoEmpresasTorre'
import { DetalhamentoTorre } from '../components/DetalhamentoTorre'
import { HistoricoEventosTorre } from '../components/HistoricoEventosTorre'
import { Alert } from '@/components/ui/Alert'
import { formatToBahia } from '@/utils/date'

export const TorrePage: React.FC = () => {
  const hojeStr = new Date().toISOString().split('T')[0]
  const [dataFiltro, setDataFiltro] = useState(hojeStr)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string | null>(null)

  const [resumo, setResumo] = useState<ResumoTorre | null>(null)
  const [empresasResumo, setEmpresasResumo] = useState<ResumoEmpresaTorre[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [detalhamento, setDetalhamento] = useState<DetalhamentoOperacional[]>([])
  const [historicoEventos, setHistoricoEventos] = useState<EventoOperacional[]>([])

  const [filtrosDetalhamento, setFiltrosDetalhamento] = useState<FiltrosDetalhamentoTorre>({
    data: hojeStr,
    limite: 50,
    offset: 0,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const carregarEmpresas = useCallback(async () => {
    try {
      const data = await empresasService.listar()
      setEmpresas(data)
    } catch {
      // Ignorar se erro pontual
    }
  }, [])

  const carregarDadosTorre = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [resData, empResData, detData, histData] = await Promise.all([
        torreService.obterResumoGeral(dataFiltro, filtrosDetalhamento.empresa_id),
        torreService.obterResumoPorEmpresa(dataFiltro),
        torreService.obterDetalhamento({ ...filtrosDetalhamento, data: dataFiltro }),
        torreService.listarHistoricoEventos({ empresa_id: filtrosDetalhamento.empresa_id, limite: 20 }),
      ])

      setResumo(resData)
      setEmpresasResumo(empResData)
      setDetalhamento(detData)
      setHistoricoEventos(histData)
      setUltimaAtualizacao(formatToBahia(new Date().toISOString(), { dateStyle: undefined, timeStyle: 'medium' }))
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar os dados da Torre de Controle.')
    } finally {
      setLoading(false)
    }
  }, [dataFiltro, filtrosDetalhamento])

  useEffect(() => {
    carregarEmpresas()
  }, [carregarEmpresas])

  useEffect(() => {
    carregarDadosTorre()
  }, [carregarDadosTorre])

  const handleDataChange = (novaData: string) => {
    setDataFiltro(novaData)
    setFiltrosDetalhamento(prev => ({ ...prev, data: novaData, offset: 0 }))
  }

  const handleSelectEmpresa = (empresaId: string) => {
    setFiltrosDetalhamento(prev => {
      const novoId = prev.empresa_id === empresaId ? undefined : empresaId
      return { ...prev, empresa_id: novoId, offset: 0 }
    })
  }

  const empresaSelecionada = empresas.find(e => e.id === filtrosDetalhamento.empresa_id)

  return (
    <div className="space-y-6">
      {/* Cabeçalho de Controle */}
      <TorreHeader
        dataFiltro={dataFiltro}
        onDataChange={handleDataChange}
        onRefresh={carregarDadosTorre}
        ultimaAtualizacao={ultimaAtualizacao}
        isLoading={loading}
      />

      {error && <Alert type="error">{error}</Alert>}

      {/* Indicadores Executivos Principais */}
      <IndicadoresTorre resumo={resumo} isLoading={loading} empresaNome={empresaSelecionada?.nome} />

      {/* Resumo Operacional por Empresa */}
      <ResumoEmpresasTorre
        empresasResumo={empresasResumo}
        isLoading={loading}
        onSelectEmpresa={handleSelectEmpresa}
        selectedEmpresaId={filtrosDetalhamento.empresa_id}
      />

      {/* Grid de Detalhamento Operacional + Feed de Eventos */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <DetalhamentoTorre
            detalhamento={detalhamento}
            empresas={empresas}
            filtros={filtrosDetalhamento}
            onFiltrosChange={setFiltrosDetalhamento}
            onClearFiltros={() =>
              setFiltrosDetalhamento({ data: dataFiltro, limite: 50, offset: 0 })
            }
            isLoading={loading}
          />
        </div>

        <div>
          <HistoricoEventosTorre
            eventos={historicoEventos}
            isLoading={loading}
            empresaNome={empresaSelecionada?.nome}
          />
        </div>
      </div>
    </div>
  )
}
