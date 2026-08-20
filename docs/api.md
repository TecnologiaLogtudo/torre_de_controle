# Especificação da API — Torre de Controle Logtudo

Este documento especifica os contratos de API, autenticação, tratamento de erros e endpoints do backend da Torre de Controle.

---

## 1. Protocolo e Formatos Globais

*   **Padrão**: REST HTTP/1.1
*   **Content-Type**: `application/json`
*   **Prefixo de Rotas**: `/api/v1`
*   **Timezones nas APIs**: Todas as datas enviadas e recebidas utilizam a especificação ISO 8601 com fuso horário `America/Bahia` (ex: `2026-08-19T22:31:35-03:00`).

---

## 2. Autenticação (JWT)

A maioria dos endpoints requer autenticação do usuário.

*   **Esquema**: HTTP Bearer Token
*   **Header**: `Authorization: Bearer <JWT_TOKEN>`
*   **Payload do Token**:
    ```json
    {
      "sub": "usuario_uuid",
      "email": "usuario@logtudo.com",
      "exp": 1787184000
    }
    ```
*   **Tempo de Expiração**: 8 horas por padrão (configurável via `.env`).

---

## 3. Padrão de Resposta de Erros

Em caso de falha, o backend retornará respostas de erro padronizadas:

```json
{
  "sucesso": false,
  "codigo": "VALOR_INVALIDO",
  "mensagem": "Descrição amigável do erro para consumo do frontend.",
  "detalhes": [
    {
      "campo": "placa",
      "erro": "A placa fornecida deve seguir o padrão Mercosul (ABC1D23) ou antigo (ABC1234)."
    }
  ]
}
```

### Principais Status HTTP Utilizados
*   `200 OK`: Requisição de consulta ou atualização processada com sucesso.
*   `201 Created`: Novo recurso criado com sucesso.
*   `400 Bad Request`: Erro de validação de dados ou violação de regra de negócio (ex: conflito de vigência).
*   `401 Unauthorized`: Credenciais incorretas ou token JWT inválido/expirado.
*   `403 Forbidden`: Usuário não possui privilégios necessários.
*   `404 Not Found`: Recurso não localizado no banco de dados.
*   `409 Conflict`: Conflito de integridade única (ex: placa ou CNPJ já cadastrado).

---

## 4. Endpoints Mapeados

### 4.1 Autenticação (`/auth`)
*   `POST /api/v1/auth/login`: Autentica o usuário e retorna o token JWT.
    *   **Entrada**: `{ "email": "...", "senha": "..." }`
    *   **Retorno**: `{ "token_acesso": "...", "tipo_token": "bearer" }`

### 4.2 Usuários (`/usuarios`)
*   `POST /api/v1/usuarios`: Cadastra um novo usuário administrativo (requer autenticação de administrador).
*   `GET /api/v1/usuarios`: Lista os usuários cadastrados (com paginação).

### 4.3 Empresas (`/empresas`)
*   `GET /api/v1/empresas`: Lista todas as empresas.
*   `POST /api/v1/empresas`: Cadastra uma nova empresa.
*   `GET /api/v1/empresas/{id}`: Detalha uma empresa específica.
*   `PUT /api/v1/empresas/{id}`: Atualiza os dados cadastrais da empresa.

### 4.4 Motoristas (`/motoristas`)
*   `GET /api/v1/motoristas`: Lista todos os motoristas cadastrados.
*   `POST /api/v1/motoristas`: Cadastra um motorista.
*   `PUT /api/v1/motoristas/{id}`: Atualiza o motorista (ex: ativar/inativar).

### 4.5 Veículos (`/veiculos`)
*   `GET /api/v1/veiculos`: Lista os veículos cadastrados.
*   `POST /api/v1/veiculos`: Cadastra um veículo (valida placa e especialidade `SECO` ou `REFRIGERADO`).
*   `PUT /api/v1/veiculos/{id}`: Atualiza dados do veículo.

### 4.6 Contratos e Capacidade (`/empresas/{empresa_id}/configuracoes`)
*   `POST /api/v1/empresas/{empresa_id}/configuracoes`: Define uma nova configuração contratual de capacidade de veículos dedicada para a empresa.
    *   **Entrada**:
        ```json
        {
          "data_inicio": "2026-09-01T00:00:00-03:00",
          "regras": {
            "HR": 4,
            "Fiorino": 4,
            "Truck": 2
          }
        }
        ```
    *   *Nota*: Executa a lógica de encerramento automático da vigência anterior e valida se não há interseções com vigências passadas.
*   `GET /api/v1/empresas/{empresa_id}/configuracoes/vigente`: Busca a configuração de capacidade ativa em uma determinada data (se omitida, assume a data/hora atual no fuso `America/Bahia`).

### 4.7 Vínculo de Motoristas Dedicados (`/motoristas/dedicados/vinculos`)
*   `POST /api/v1/motoristas/dedicados/vinculos`: Associa um motorista a uma empresa contratante como dedicado.
    *   **Entrada**:
        ```json
        {
          "empresa_id": "uuid-empresa",
          "motorista_id": "uuid-motorista",
          "tipo_veiculo": "HR",
          "categoria_operacional": "DEDICADO"
        }
        ```
    *   *Nota*: Valida se o motorista já possui algum outro vínculo dedicado ativo.
*   `POST /api/v1/motoristas/dedicados/vinculos/{id}/desativar`: Desativa o vínculo de um motorista dedicado (altera `ativo = false`), liberando-o para novos contratos sem excluir o histórico de sua alocação passada.
