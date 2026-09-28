import { useState, useEffect, useCallback } from 'react'
import { torreService } from '@/services/torre/torreService'
import { empresasService } from '@/services/empresas/empresasService'
import { getErrorMessage } from '@/services/api/errors'
import { getHojeBahiaIso, formatTimeBahia } from '@/utils/date'
import {
  ResumoTorre,
  ResumoEmpresaTorre,
  DetalhamentoOperacional,
  EventoOperacional,
  FiltrosDetalhamentoTorre,
} from '@/types/torre'
import { Empresa } from '@/types/empresas'

export function useTorreOperacional() {
  const hojeStr = getHojeBahiaIso()
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
      // Ignorar se erro pontual de lista auxiliar
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
      setUltimaAtualizacao(formatTimeBahia(new Date()))
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erro ao carregar os dados da Torre de Controle.'))
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

  const handleClearFiltros = () => {
    setFiltrosDetalhamento({ data: dataFiltro, limite: 50, offset: 0 })
  }

  const empresaSelecionada = empresas.find(e => e.id === filtrosDetalhamento.empresa_id)

  return {
    dataFiltro,
    ultimaAtualizacao,
    resumo,
    empresasResumo,
    empresas,
    detalhamento,
    historicoEventos,
    filtrosDetalhamento,
    setFiltrosDetalhamento,
    handleClearFiltros,
    loading,
    error,
    carregarDadosTorre,
    handleDataChange,
    handleSelectEmpresa,
    empresaSelecionada,
  }
}
