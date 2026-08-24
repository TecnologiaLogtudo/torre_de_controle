export interface MotivoIndisponibilidade {
  id: string
  nome: string
  descricao?: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface MotivoIndisponibilidadeCreatePayload {
  nome: string
  descricao?: string | null
}

export interface MotivoIndisponibilidadeUpdatePayload {
  nome?: string | null
  descricao?: string | null
  ativo?: boolean | null
}

export interface ConfiguracaoSistema {
  id: string
  chave: string
  valor: string
  descricao?: string | null
  atualizado_em: string
}
