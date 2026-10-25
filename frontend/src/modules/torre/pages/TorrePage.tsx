import React from 'react'
import { useTorreOperacional } from '../hooks/useTorreOperacional'
import { TorreHeader } from '../components/TorreHeader'
import { IndicadoresTorre } from '../components/IndicadoresTorre'
import { ResumoEmpresasTorre } from '../components/ResumoEmpresasTorre'
import { DetalhamentoTorre } from '../components/DetalhamentoTorre'
import { HistoricoEventosTorre } from '../components/HistoricoEventosTorre'
import { Alert } from '@/components/ui/Alert'

export const TorrePage: React.FC = () => {
  const {
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
    handleSelectEmpresa,
    empresaSelecionada,
  } = useTorreOperacional()

  return (
    <div className="space-y-6">
      {/* Cabeçalho de Controle */}
      <TorreHeader
        dataFiltro={dataFiltro}
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

      {/* Grid Expandido de Detalhamento Operacional + Feed de Eventos */}
      <div className="flex flex-col xl:flex-row gap-5 items-start">
        <div className="flex-1 min-w-0 w-full">
          <DetalhamentoTorre
            detalhamento={detalhamento}
            empresas={empresas}
            filtros={filtrosDetalhamento}
            onFiltrosChange={setFiltrosDetalhamento}
            onClearFiltros={handleClearFiltros}
            isLoading={loading}
            onReload={carregarDadosTorre}
          />
        </div>

        <div className="w-full xl:w-[330px] 2xl:w-[360px] shrink-0">
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
