export interface Motorista {
  id: string
  nome: string
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface MotoristaCreatePayload {
  nome: string
}

export interface MotoristaUpdatePayload {
  nome: string
  ativo: boolean
}
