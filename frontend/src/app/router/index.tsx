import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicOnlyRoute } from './PublicOnlyRoute'
import { ApplicationLayout } from '../layouts/ApplicationLayout'
import { LoginPage } from '@/modules/auth/pages/LoginPage'
import { TorrePage } from '@/modules/torre/pages/TorrePage'
import { EmpresasPage } from '@/modules/empresas/pages/EmpresasPage'
import { MotoristasPage } from '@/modules/motoristas/pages/MotoristasPage'
import { VeiculosPage } from '@/modules/veiculos/pages/VeiculosPage'
import { ContratosPage } from '@/modules/contratos/pages/ContratosPage'
import { MotivosIndisponibilidadePage } from '@/modules/operacao/pages/MotivosIndisponibilidadePage'
import { UsuariosPage } from '@/modules/usuarios/pages/UsuariosPage'
import { AgendamentosPage } from '@/modules/agendamentos/pages/AgendamentosPage'
import { AgendamentoDetalhesPage } from '@/modules/agendamentos/pages/AgendamentoDetalhesPage'
import { HistoricoEventosPage } from '@/modules/operacao/pages/HistoricoEventosPage'

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota Pública de Login */}
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />

        {/* Rotas Privadas da Aplicação (Layout Operacional) */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <ApplicationLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard da Torre de Controle Operacional */}
          <Route index element={<TorrePage />} />
          <Route path="torre" element={<TorrePage />} />

          {/* Módulos Operacionais */}
          <Route path="operacao" element={<HistoricoEventosPage />} />
          <Route path="empresas" element={<EmpresasPage />} />
          <Route path="motoristas" element={<MotoristasPage />} />
          <Route path="veiculos" element={<VeiculosPage />} />
          <Route path="contratos" element={<ContratosPage />} />
          <Route path="configuracoes/motivos-indisponibilidade" element={<MotivosIndisponibilidadePage />} />
          <Route path="usuarios" element={<UsuariosPage />} />
          <Route path="agendamentos" element={<AgendamentosPage />} />
          <Route path="agendamentos/:id" element={<AgendamentoDetalhesPage />} />

          {/* Fallback */}
          <Route path="*" element={<TorrePage />} />
        </Route>

        {/* Redirecionamentos Globais */}
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
