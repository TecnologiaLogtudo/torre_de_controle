# Documentação do Motor Operacional & Torre de Controle

Este documento especifica o funcionamento do Motor Operacional da **Torre de Controle Logtudo** implementado na Fase 2.

## 1. Ciclo de Vida e Máquina de Estados do Agendamento

O agendamento possui status próprio e independente do status operacional dos motoristas e veículos.

```text
RASCUNHO ──> PROGRAMADO ──> EM_EXECUCAO ──> CONCLUIDO
   │              │              │
   └──────────────┴──────────────┴───────> CANCELADO
```

### Transições Permitidas:
- `RASCUNHO` -> `PROGRAMADO`, `CANCELADO`
- `PROGRAMADO` -> `EM_EXECUCAO`, `CANCELADO`
- `EM_EXECUCAO` -> `CONCLUIDO`, `CANCELADO`
- Agendamentos nos estados `CONCLUIDO` ou `CANCELADO` são finais e não permitem novas alterações.

---

## 2. Janelas de Criação e Alteração de Agendamentos

O sistema impõe regras estritas de janela temporal baseadas no fuso horário `America/Bahia`:

1. **Dia Atual:**
   - Apenas permitido criar se a hora atual for anterior ou igual ao limite configurado no sistema (`horario_limite_agendamento_dia_atual`, cujo valor padrão é `12:00`).
   - Caso o horário atual seja superior a `12:00`, a API retorna HTTP `400 Bad Request`.
2. **Dia Seguinte:**
   - Permitido criar e atualizar livremente durante todo o dia anterior.
3. **Datas Retroativas e Futuras (> 1 dia):**
   - Rejeitadas no MVP com HTTP `400 Bad Request`.

---

## 3. Composição Operacional (Dedicados vs SPOT)

### Dedicados:
- Representam a relação persistente: **Empresa + Motorista + Veículo Físico + Tipo de Veículo**.
- Ao criar um agendamento para uma empresa, o sistema busca automaticamente os motoristas/veículos dedicados ativos e inclui na composição.
- Se o dedicado estiver `INDISPONIVEL`, ele continua aparecendo na programação, contabilizando nos indicadores da empresa e ocupando a vaga contratual.

### SPOT:
- Motoristas e veículos alocados sob demanda, sem vínculo permanente.
- Podem ser adicionados, substituídos ou removidos do agendamento via API.

---

## 4. Máquina de Estados Operacional (Binômio Motorista + Veículo)

```text
               ┌──────────────┐
               │  DISPONIVEL  │◄─────────────────┐
               └──────┬───────┘                  │
                      │                          │
                      ▼                          │
               ┌──────────────┐                  │
               │  PROGRAMADO  ├──────────┐       │
               └──────┬───────┘          │       │
                      │                  ▼       │
                      ▼           ┌──────────────┤
               ┌──────────────┐   │ INDISPONIVEL │
               │   EM_ROTA    ├──►└──────────────┘
               └──────┬───────┘
                      │
                      └──────────────────────────┘
                         (Liberação/Reutilização)
```

### Regras de Transição e Validação:
- **`INDISPONIVEL`:** Exige obrigatoriamente um motivo cadastrado e ativo (`motivo_indisponibilidade_id`).
- **Reutilização no mesmo dia:** Quando um atendimento é concluído e o estado operacional muda de `EM_ROTA` para `DISPONIVEL`, o motorista e veículo ficam livres para uma nova alocação no mesmo dia.
- **Prevenção de Dupla Alocação:** A API valida no banco de dados se um motorista ou veículo já possui alocação com status `PROGRAMADO` ou `EM_ROTA` em outro agendamento ativo na mesma data, impedindo conflitos operacionais.

---

## 5. Histórico e Eventos Operacionais Imutáveis

- **Histórico do Agendamento (`HistoricoAgendamento`):** Registra alterações na composição (inclusão/remoção de SPOT, troca de veículo, alteração de horário).
- **Eventos Operacionais (`EventoOperacional`):** Registro imutável gerado a cada mudança de estado operacional de um motorista/veículo, salvando a data/hora local (`America/Bahia`), usuário responsável, novo status e a descrição histórica do motivo de indisponibilidade.

---

## 6. Hardening e Garantias Técnicas (Fase 2.9)

### 6.1 Exclusividade de Veículo Dedicado
- **Regra:** Um veículo físico só pode estar vinculado a **uma única empresa dedicada ativa** por vez.
- **Implementação:** Garantido via índice único parcial no PostgreSQL: `idx_unique_veiculo_dedicado_ativo ON motoristas_dedicados_vinculos (veiculo_id) WHERE (ativo = true)`.
- **Tratamento:** A API intercepta o erro de integridade e retorna HTTP `400 Bad Request`.

### 6.2 Prevenção de Race Condition na Alocação Concorrente
- **Regra:** Requisições simultâneas para alocação do mesmo motorista ou veículo em agendamentos distintos são serializadas de forma concorrente.
- **Implementação:** Trava pessimista `with_for_update()` nas entidades `Motorista` e `Veiculo` durante a verificação de conflitos em `verificar_conflito_alocacao`.

### 6.3 Indicadores de Capacidade Contratual da Torre
- **Fórmula de Capacidade:**
  $$\text{CONTRATADOS} = \text{PROGRAMADOS} + \text{EM\_ROTA} + \text{DISPONÍVEIS} + \text{INDISPONÍVEIS} + \text{VAGAS\_NAO\_PREENCHIDAS}$$
- **Visualização:** A API expõe `contratados` e `vagas_nao_preenchidas` nos endpoints de resumo da Torre (`/operacao/torre/resumo` e `/operacao/torre/empresas-resumo`).

### 6.4 Snapshot Histórico de Contrato
- **Regra:** Todo agendamento registra a configuração contratual ativa da empresa no momento da criação (`contrato_configuracao_id`).
- **Garantia:** Preserva a referência histórica do contrato vigente mesmo após futuras atualizações ou reconfigurações contratuais da empresa.

### 6.5 Filtros de Período Respeitando Fuso Horário `America/Bahia`
- **Regra:** Consultas operacionais baseadas em datas convertem explicitamente o início (`00:00:00.000000`) e o fim do dia (`23:59:59.999999`) do fuso `America/Bahia` para UTC antes da execução das queries no PostgreSQL.

---

## 7. Consolidação de APIs para a Fase 4 / Frontend (Fase 3)

### 7.1 Autenticação e Usuários
- `GET /api/v1/auth/me`: Retorna os dados do usuário autenticado a partir do token JWT.
- `GET /api/v1/usuarios/{id}`: Retorna os detalhes de um usuário por UUID.
- `PUT /api/v1/usuarios/{id}`: Permite a atualização de dados cadastrais (`nome`, `email`, `ativo`) com auditoria automática.

### 7.2 Histórico Contratual
- `GET /api/v1/contratos/empresas/{empresa_id}/configuracoes`: Retorna todo o histórico de alterações contratuais da empresa em ordem cronológica decrescente.

### 7.3 Operação Avançada de SPOT (Substituição Atômica)
- `POST /api/v1/agendamentos/alocacoes/{alocacao_id}/substituir`: Realiza a substituição atômica de uma alocação SPOT por um novo motorista e veículo.
- **Trava de Concorrência:** Aplica `with_for_update()` nos registros do novo motorista e veículo para prevenir dupla alocação simultânea.
- **Atomicidade:** Em caso de qualquer inconsistência ou conflito, executa ROLLBACK automático. Registra log em `HistoricoAgendamento` (`tipo_alteracao="SUBSTITUICAO_SPOT"`).

### 7.4 Histórico de Agendamento
- `GET /api/v1/agendamentos/{agendamento_id}/historico`: Consulta os registros imutáveis de alterações ocorridas no agendamento.

### 7.5 Paginação e Filtros para Frontend
- `GET /api/v1/agendamentos`: Suporta `limite` e `offset`, além do modo paginado estrito (`paginado=true`).
- `GET /api/v1/operacao/torre/detalhamento`: Suporta filtros por `placa`, `motorista_nome`, `motorista_id`, `empresa_id`, `data`, `status`, `categoria`, `tipo_veiculo`, `especialidade` e paginação.
- `GET /api/v1/operacao/historico-eventos`: Suporta filtros por período em `America/Bahia`, `empresa_id`, `motorista_id`, `veiculo_id`, `categoria`, `novo_status`, `motivo`, `usuario_id` e paginação.
