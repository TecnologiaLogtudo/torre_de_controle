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
    handleDataChange,
    handleSelectEmpresa,
    empresaSelecionada,
  } = useTorreOperacional()

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
            onClearFiltros={handleClearFiltros}
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
