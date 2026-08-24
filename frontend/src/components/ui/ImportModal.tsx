import React, { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Alert } from './Alert'
import { torreService } from '@/services/torre/torreService'
import { ResultadoImportacao } from '@/types/torre'
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react'

export interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setError(null)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) {
        setSelectedFile(file)
        setError(null)
      } else {
        setError('Por favor, selecione um arquivo válido (.xlsx ou .csv).')
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Selecione um arquivo .xlsx ou .csv para importar.')
      return
    }

    setUploading(true)
    setError(null)
    try {
      const res = await torreService.importarPlanilha(selectedFile)
      setResultado(res)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err.message || 'Erro ao importar a planilha. Verifique o formato do arquivo.')
    } finally {
      setUploading(false)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setResultado(null)
    setError(null)
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Importar Planilha de Motoristas e Veículos"
      subtitle="Cadastre veículos, motoristas e vínculos contratuais em lote através de arquivo .xlsx ou .csv"
      size="lg"
    >
      <div className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}

        {!resultado ? (
          <div className="space-y-4">
            {/* Zona de Drop */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-xl p-8 text-center bg-slate-950/60 transition-colors cursor-pointer relative"
            >
              <input
                type="file"
                accept=".xlsx,.csv"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <FileSpreadsheet className="w-12 h-12 text-sky-400" />
                <p className="text-sm font-semibold text-slate-200">
                  {selectedFile ? selectedFile.name : 'Arraste sua planilha aqui ou clique para selecionar'}
                </p>
                <p className="text-xs text-slate-400">Suporta formatos oficial Excel (.xlsx) ou CSV</p>
              </div>
            </div>

            {selectedFile && (
              <div className="p-3 bg-sky-950/30 border border-sky-800/40 rounded-lg flex items-center justify-between text-xs">
                <span className="text-sky-300 font-mono">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                  Remover
                </Button>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={handleClose} disabled={uploading}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleUpload}
                isLoading={uploading}
                disabled={!selectedFile}
                leftIcon={<Upload className="w-4 h-4" />}
              >
                Processar Importação
              </Button>
            </div>
          </div>
        ) : (
          /* Relatório de Resultado da Importação */
          <div className="space-y-5">
            <div className="p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-emerald-300">Importação Concluída com Sucesso!</h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Processadas {resultado.total_linhas} linhas da planilha com correlação aos campos do sistema.
                </p>
              </div>
            </div>

            {/* Grid de Resumo de Entidades Criadas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-2xl font-bold text-sky-400 font-mono">{resultado.criados_veiculos}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Veículos Criados</span>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-2xl font-bold text-emerald-400 font-mono">{resultado.criados_motoristas}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Motoristas Criados</span>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-2xl font-bold text-indigo-400 font-mono">{resultado.criadas_empresas}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Empresas Criadas</span>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-2xl font-bold text-amber-400 font-mono">{resultado.vinculos_dedicados_criados}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Vínculos Dedicados</span>
              </div>
            </div>

            {/* Alerta de Placas Ignoradas por Duplicação */}
            {resultado.ignorados_placa_existente > 0 && (
              <div className="p-3 bg-amber-950/30 border border-amber-800/50 rounded-lg flex items-center gap-2 text-xs text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>{resultado.ignorados_placa_existente} veículo(s)</strong> já cadastrados no sistema foram ignorados mantendo os registros atuais intactos.
                </span>
              </div>
            )}

            {/* Lista Detalhada de Erros ou Placas Ignoradas */}
            {resultado.itens_ignorados.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Detalhamento de Linhas Ignoradas / Avisos ({resultado.itens_ignorados.length})
                </h5>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {resultado.itens_ignorados.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-lg flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-slate-400">Linha {item.linha}:</span>
                        <span className="font-mono font-bold text-sky-400">[{item.placa}]</span>
                        <span className="text-slate-300">{item.motorista}</span>
                      </div>
                      <span className="text-[11px] text-amber-400 shrink-0 font-medium">{item.motivo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={handleReset} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
                Importar Outra Planilha
              </Button>
              <Button variant="primary" size="sm" onClick={handleClose}>
                Concluir
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
