export interface Empresa {
  id: string
  nome: string
  identificacao: string
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface EmpresaCreatePayload {
  nome: string
  identificacao: string
}

export interface EmpresaUpdatePayload {
  nome: string
  ativo: boolean
}
