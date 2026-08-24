import React from 'react'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatToBahia } from '@/utils/date'
import {
  Radio,
  Clock,
  UserCheck,
  Truck,
  Activity,
  Calendar,
  Building2,
  ShieldCheck,
} from 'lucide-react'

export const TorrePlaceholderPage: React.FC = () => {
  const { user } = useAuth()

  const agoraUtc = new Date().toISOString()
  const agoraBahia = formatToBahia(agoraUtc)

  const modulosProximos = [
    { nome: 'Operação & Status', icone: <Activity className="w-5 h-5 text-amber-400" />, fase: 'Fase 4.2' },
    { nome: 'Agendamentos', icone: <Calendar className="w-5 h-5 text-blue-400" />, fase: 'Fase 4.2' },
    { nome: 'Gestão de Motoristas', icone: <UserCheck className="w-5 h-5 text-emerald-400" />, fase: 'Fase 4.2' },
    { nome: 'Gestão de Veículos', icone: <Truck className="w-5 h-5 text-indigo-400" />, fase: 'Fase 4.2' },
    { nome: 'Empresas & Contratos', icone: <Building2 className="w-5 h-5 text-purple-400" />, fase: 'Fase 4.2' },
    { nome: 'Torre de Controle Operacional', icone: <Radio className="w-5 h-5 text-sky-400" />, fase: 'Fase 4.3' },
    { nome: 'Auditoria & Trilhas', icone: <ShieldCheck className="w-5 h-5 text-amber-500" />, fase: 'Fase 4.4' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Torre de Controle"
        subtitle="Painel Operacional Logtudo - Fundação do Frontend (Fase 4.1)"
        badge={<Badge variant="SUCESSO" dot>Fase 4.1 Ativa</Badge>}
      />

      {/* Card de Boas-Vindas */}
      <Card className="border-sky-800/40 bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Olá, {user?.nome || 'Operador'}!
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              A Fundação do Frontend (Fase 4.1) foi inicializada com sucesso. A sessão está autenticada,
              o token JWT está seguro e a comunicação com a API REST está operacional.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg shrink-0">
            <Clock className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="text-[11px]">
              <span className="text-slate-400 block">Horário (America/Bahia):</span>
              <span className="font-mono font-semibold text-slate-200">{agoraBahia}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Grid de Validação dos Pilares */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Autenticação JWT" subtitle="Validação do Usuário">
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Usuário:</span>
              <span className="font-semibold text-slate-200">{user?.nome}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">E-mail:</span>
              <span className="font-mono text-slate-300">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Status da Conta:</span>
              <Badge variant={user?.ativo ? 'SUCESSO' : 'ERRO'}>
                {user?.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </div>
        </Card>

        <Card title="Timezone Oficial" subtitle="America/Bahia">
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Fuso Oficial:</span>
              <span className="font-semibold text-sky-400">America/Bahia (UTC-3)</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Origem Banco:</span>
              <span className="font-mono text-slate-300">UTC</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Conversão Frontend:</span>
              <span className="text-emerald-400 font-semibold">Ativa</span>
            </div>
          </div>
        </Card>

        <Card title="Infraestrutura HTTP" subtitle="Cliente & Interceptors">
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Injeção Bearer:</span>
              <span className="text-emerald-400 font-semibold">Automática</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Tratamento 401:</span>
              <span className="text-emerald-400 font-semibold">Auto Logout</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Erros Globais:</span>
              <span className="text-emerald-400 font-semibold">Padronizados</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Módulos Preparados para as Próximas Fases */}
      <Card
        title="Próximas Etapas da Arquitetura"
        subtitle="Módulos operacionais estruturados para implementação posterior"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
          {modulosProximos.map((m, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {m.icone}
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">{m.nome}</h4>
                  <span className="text-[10px] text-slate-500">{m.fase}</span>
                </div>
              </div>
              <Badge variant="EM_BREVE" size="sm">
                Em breve
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
