import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Mail, Lock, ShieldCheck } from 'lucide-react'
import logoOfficial from '@/Identidade visual/Logos/Variações do Logo_Prancheta 1-01.png'
import textureBg from '@/Identidade visual/Texturas/texturas_Prancheta 1-01.png'

export const LoginPage: React.FC = () => {
  const { login, error, clearError } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setFormError(null)

    if (!email.trim() || !senha.trim()) {
      setFormError('Por favor, preencha o e-mail e a senha.')
      return
    }

    setIsSubmitting(true)
    try {
      await login({ email: email.trim(), senha })
      navigate('/app', { replace: true })
    } catch {
      // Erro é tratado no AuthProvider
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeError = formError || error

  return (
    <div className="relative min-h-screen bg-logtudo-deep flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Camada de Textura Oficial Logtudo como marca d'água de fundo */}
      <div
        className="absolute inset-0 pointer-events-none opacity-15 mix-blend-overlay bg-cover bg-center"
        style={{ backgroundImage: `url(${textureBg})` }}
      />

      {/* Brilho institucional sutil em gradiente Teal */}
      <div className="absolute w-[500px] h-[500px] bg-logtudo-primary/20 rounded-full blur-3xl pointer-events-none -top-20 -left-20" />
      <div className="absolute w-[400px] h-[400px] bg-logtudo-accent/10 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20" />

      {/* Card de Autenticação */}
      <div className="w-full max-w-md bg-logtudo-surface border border-logtudo-border/80 rounded-2xl p-8 shadow-2xl shadow-black/80 relative z-10 backdrop-blur-md">
        {/* Detalhe estético do topo com cor primária institucional */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-logtudo-primary via-logtudo-accent to-logtudo-primary rounded-t-2xl" />

        {/* Branding Oficial com Logo e Identidade da Marca */}
        <div className="flex flex-col items-center text-center mb-8 pt-2">
          <img
            src={logoOfficial}
            alt="Logtudo Logística Oficial"
            className="h-16 w-auto object-contain mb-4 drop-shadow-md"
          />
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            Torre de Controle Operacional
          </h1>
          <p className="text-xs text-logtudo-accent font-medium mt-1">
            Sistema Operacional de Gestão Logística
          </p>
        </div>

        {/* Alertas de Erro */}
        {activeError && (
          <Alert type="error" title="Acesso negado" onClose={clearError} className="mb-6">
            {activeError}
          </Alert>
        )}

        {/* Formulário de Login */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="E-mail de acesso"
            type="email"
            placeholder="operador@logtudo.com.br"
            value={email}
            onChange={e => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4 text-logtudo-accent" />}
            autoComplete="email"
            required
          />

          <Input
            label="Senha"
            type="password"
            placeholder="••••••••"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            leftIcon={<Lock className="w-4 h-4 text-logtudo-accent" />}
            autoComplete="current-password"
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            className="w-full mt-2 bg-logtudo-primary hover:bg-logtudo-hover text-white shadow-lg shadow-logtudo-primary/30 border border-logtudo-accent/30"
          >
            Entrar no Sistema
          </Button>
        </form>

        {/* Rodapé Institucional e Segurança */}
        <div className="mt-8 pt-6 border-t border-logtudo-border/60 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Autenticação Segura JWT</span>
          </div>
          <span className="font-mono">Fuso: America/Bahia</span>
        </div>
      </div>
    </div>
  )
}
