# Diário de Bordo — Torre de Controle Logtudo

## [2026-10-26] Eliminação do Status "Sem Alocação" e Adoção da Disponibilidade Natural

### 1. Diagnóstico do Problema de Status e Causas Raízes
- **Sintoma Relatado**: Motoristas disponíveis mudavam repetidamente seu status para "Sem Alocação".
- **Causas Raízes Identificadas**:
  1. *Efemeridade Diária*: A tabela `status_operacional_motoristas` gravava o status fixado a uma data específica. Ao virar o dia ou consultar nova data no calendário, não havia registro diário para a data alvo, caindo no fallback `status_op = "SEM_ALOCACAO"`.
  2. *Desalocação SPOT / Cancelamento de Agendamentos*: Ao desalocar um motorista de um agendamento ou cancelar uma programação, o vínculo era excluído, mas nenhum status `DISPONIVEL` avulso era persistido, empurrando o motorista para o fallback "Sem Alocação".
  3. *Confusão de Domínio*: "Sem Alocação" não é um status de prontidão operacional, mas sim a ausência de uma alocação ativa. Um motorista ativo sem apontamento de indisponibilidade é conceitualmente `DISPONIVEL`.

### 2. Solução Implementada
- **Backend**:
  - `OperacaoService.obter_status_motoristas`: Fallback de recursos livres sem exceção diária atualizado para `DISPONIVEL`.
  - Tratamento resiliente e retrocompatível: requisições com `novo_status == "SEM_ALOCACAO"` são normalizadas automaticamente para `DISPONIVEL`.
  - Remoção de `"SEM_ALOCACAO"` dos pesos de ordenação e mapa de contagem, mantendo `sem_alocacao=0` para integridade da API externa.
- **Frontend**:
  - Removido o banner de alerta e ação em lote "Tornar Todos Disponíveis".
  - Removido o card de resumo "Sem Alocação" dos indicadores do topo.
  - Atualizadas as opções de status para os 4 status canônicos: `Disponível`, `Programado`, `Em Rota` e `Indisponível`.
- **Testes**:
  - Suíte do frontend Vitest 100% verde (54 testes passando).
  - Testes do backend adaptados para certificar a nova regra de disponibilidade natural.

## [2026-10-21] Persistência de Viagens em Rota, Conclusão de Agendamentos e Regularização de Frota

### 1. Diagnóstico do Conflito de Alocação e Regra de Negócio de Viagens em Rota
- **Cenário**: O motorista "Pedro Vitor Andrade" entrou em rota em 05/10 e nunca foi baixado/concluído. Na data atual (21/10), o operador observou que ele aparecia como "Não alocado", na Torre não constava na lista de "Em rota", e a tentativa de alocá-lo em um novo agendamento retornava HTTP 400.
- **Causa Raiz**: O backend checava `AlocacaoOperacional.status_operacional == 'EM_ROTA'` sem filtro de data em `verificar_conflito_alocacao` para impedir que um recurso em rota fosse escalado simultaneamente. Porém, as telas de Torre e Status olhavam apenas a data de hoje, e não havia mecanismo de conclusão formal de programações para desmobilizar os recursos.
- **Solução Implementada**:
  - Viagens com status `EM_ROTA` permanecem retidas até sua baixa explícita, com visibilidade transparente em datas posteriores através do indicador `desde DD/MM`.
  - A Torre de Controle totaliza no card "Em rota" e na lista de recursos todas as viagens ativas da frota (do dia e de dias anteriores em aberto).
  - No modal SPOT de novos agendamentos, recursos com viagens ativas em aberto são excluídos das opções de seleção.
  - Disponibilizada a baixa individual imediata nos Drawers de Status/Torre mesmo para viagens de datas passadas.

### 2. Conclusão Formal de Agendamentos e Liberação em Lote
- **Backend (`app/agendamentos/services.py`, `routers.py`)**:
  - Implementado o método `concluir_agendamento(db, agendamento_id, usuario_id)`.
  - Valida que a programação foi oficializada ($v \ge 1$), não é futura ($\le \text{hoje}$) e não está cancelada/concluída.
  - Altera o status do agendamento para `CONCLUIDO` e passa todas as alocações em `EM_ROTA` ou `PROGRAMADO` para `DISPONIVEL`, registrando os eventos operacionais de encerramento.
  - Exposto o endpoint `POST /api/v1/agendamentos/{agendamento_id}/concluir`.
- **Frontend (`AgendamentosPage.tsx`, `AgendamentoDetalhesPage.tsx`, `agendamentosService.ts`)**:
  - Adicionado botão de ação rápida "Concluir" na coluna Ação da tabela de Agendamentos Operacionais para agendamentos $v \ge 1$ e status elegíveis.
  - Adicionado botão "Concluir Agendamento" no cabeçalho da página de Detalhes do Agendamento.
  - Modais de confirmação explicativos detalhando a liberação automática dos recursos vinculados.

### 3. Saneamento Automático de Dados Históricos no Startup
- **Rotina Defensiva no Startup (`app/main.py`)**:
  - Execução de queries de migração de dados no evento de inicialização para concluir automaticamente agendamentos e liberar alocações/status com datas anteriores a 21/10/2026 (período de testes pré-piloto), permitindo que todos os motoristas e veículos voltem a ficar imediatamente disponíveis na base de dados de produção.

## [2026-10-21] Correção de Exibição de Erros da API e Observabilidade de Alocações

### Preservação e Fidelidade das Mensagens de Erro da API (`frontend/src/services/api/errors.ts`)
- **Resolução do Erro Genérico no Frontend**:
  - Corrigido o fluxo de duplo parsing em `parseApiError` e `getErrorMessage`. Quando o interceptor do Axios rejeitava um objeto `ApiError`, as chamadas subsequentes em blocos `catch` não reconheciam o objeto parseado e descartavam o atributo `detail` da API, caindo no fallback genérico *"Ocorreu um erro inesperado ao processar sua requisição."*.
  - Implementada verificação prioritária de `isApiError` e extração de propriedades `detail` e `message` em plain objects, garantindo que qualquer rejeição ou regra violada (ex: duplicidade de motorista/veículo, vínculo contratual dedicado, indisponibilidade ativa na data ou dia anterior) seja exibida com clareza nos toasts e modais para o usuário.
  - Criada suíte de testes unitários `frontend/src/test/errors.test.ts` cobrindo cenários com AxiosError, ApiError pré-parseado, erros 422 Pydantic e fallbacks customizados.

### Observabilidade e Logs Estruturados de Conflito de Alocação (`app/agendamentos/services.py`)
- **Rastreabilidade no Servidor**:
  - Incorporado `logger = logging.getLogger(__name__)` em `app/agendamentos/services.py`.
  - Adicionadas emissões estruturadas de `logger.warning` em cada uma das regras de bloqueio de `verificar_conflito_alocacao` (duplicidade no agendamento, exclusividade de motorista dedicado, exclusividade de veículo dedicado, indisponibilidade de motorista/veículo na data ou dia anterior, e concorrência em outro agendamento ativo).
  - Permite aos operadores e desenvolvedores identificar imediatamente nos logs da VPS (`docker logs torre-de-controle-backend`) a causa exata pela qual uma alocação foi rejeitada com `HTTP 400`.

## [2026-10-07] Desacoplamento de Status SPOT, Versionamento Oficial de Agendamento, Ações em Lote e Refinamento de UI

### Ordenação Prioritária de Recursos por Status Operacional
- **Regra de Prioridade Estrita nas Listagens de Recursos (`app/operacao/services.py`, `DetalhamentoTorre.tsx`, `StatusMotoristasPage.tsx`)**:
  - Implementada ordenação operacional hierárquica para as listas de recursos em **Status de Motoristas** e **Detalhamento Operacional dos Recursos** (Torre de Controle):
    1. `EM_ROTA` (Em rota)
    2. `PROGRAMADO` (Programados)
    3. `DISPONIVEL` (Disponíveis)
    4. `INDISPONIVEL` (Indisponíveis)
    5. `SEM_ALOCACAO` / outros (Sem alocação)
    - Critério de desempate: Ordem alfabética ascendente pelo nome do motorista (`motorista_nome`).
  - **Backend**:
    - `obter_detalhamento_operacional`: Ordenação direta via cláusula SQL `order_by(case(...), Motorista.nome.asc())`.
    - `obter_status_motoristas`: Ordenação em memória após agregação consolidada de alocações e status diários SPOT.
  - **Frontend**:
    - `DetalhamentoTorre.tsx`: Ordenação reativa via `useMemo` com tabela de pesos de status e desempate `localeCompare`.
    - `StatusMotoristasPage.tsx`: Ordenação da lista filtrada respeitando a hierarquia operacional e ordem alfabética.
  - **Testes Automatizados**:
    - Criado teste de integração `test_ordenacao_status_motoristas_e_detalhamento` validando a sequência retornada em ambos os endpoints.

### Hotfix: Migração Automática no Startup da VPS, DDLs Defensivos e Favicon Base Path
- **Migração Automática no Backend (`app/main.py`, `alembic/`)**:
  - Adicionadas instruções DDL defensivas no evento `@app.on_event("startup")` para aplicar automaticamente no PostgreSQL da VPS as alterações estruturais:
    - `ALTER TABLE eventos_operacionais ALTER COLUMN empresa_id DROP NOT NULL;`
    - `ALTER TABLE eventos_operacionais ALTER COLUMN veiculo_id DROP NOT NULL;`
    - `CREATE TABLE IF NOT EXISTS status_operacional_motoristas (...)` e índice único `idx_status_motorista_data`.
  - Criada a migração oficial do Alembic `9c0d1e2f3a4b_status_operacional_motoristas_e_eventos_nullable.py` encadeada na revisão `8b9c0d1e2f3a`.
  - Importados todos os modelos explicitamente em `app/main.py` e `alembic/env.py` garantindo que o SQLAlchemy registre `status_operacional_motoristas` no `Base.metadata`.
  - Ajustado fallback em `OperacaoService.alterar_status_motorista` para utilizar `"SEM_ALOCACAO"` como `status_anterior` padrão de recursos sem histórico prévio.
  - Resolvido o erro HTTP 500 no endpoint `/api/v1/operacao/status-lote`.
- **Resolução do Erro 500 em `historico-eventos` (`app/operacao/schemas.py`, `frontend/src/types/torre.ts`)**:
  - Flexibilizados os campos `empresa_id` e `veiculo_id` em `EventoOperacionalResponse` para `Optional[UUID] = None` (e `string | null` no TypeScript), sanando a exceção `ResponseValidationError` do FastAPI disparada ao listar eventos de motoristas SPOT livres.
  - Atualizado fallback no `HistoricoEventosPage.tsx` para apresentar `"Sem Vínculo (SPOT)"` quando `empresa_nome` for nulo.
  - Adicionado teste automatizado de regressão `test_historico_eventos_com_eventos_sem_empresa_e_sem_veiculo`.
- **Resolução do Erro 404 de Favicon no Frontend (`frontend/index.html`)**:
  - Corrigido o caminho de `href="./favicon.svg"` para `href="/torre-de-controle/favicon.svg"`, garantindo que navegações em rotas SPA profundas (ex: `/app/motoristas`, `/app/configuracoes`) não sofram falha 404 por resolução relativa.

### Desacoplamento do Status SPOT e Isolamento por Empresa
- **Persistência Independente (`status_operacional_motoristas`)**:
  - Criado o modelo e tabela `StatusOperacionalMotorista` (`status_operacional_motoristas`) com índice único `(motorista_id, data)` para armazenar o status operacional diário de motoristas SPOT (`DISPONIVEL`, `INDISPONIVEL`, `SEM_ALOCACAO`) de forma desacoplada de `Agendamento` e sem vincular a nenhuma empresa parceira.
  - Campos `empresa_id` e `veiculo_id` em `eventos_operacionais` ajustados para `nullable=True`, permitindo trilha de auditoria completa em recursos livres.
- **Isolamento da Tabela "Situação Operacional por Empresa"**:
  - Refatorados `obter_resumo_por_empresa` e `obter_resumo_geral`:
    - A linha de uma empresa consolida estritamente recursos dedicados/contratados e recursos SPOT formalmente agendados (`PROGRAMADO` ou `EM_ROTA`) para ela.
    - Recursos SPOT disponíveis ou indisponíveis permanecem no pool geral livre e não são mais atribuídos a nenhuma empresa (a empresa parceira 3 Corações agora exibe 0 recursos).
  - Regularização de dados: limpos 318 registros de alocações indevidas em `alocacoes_operacionais` atrelados à 3 Corações, migrando os status para `status_operacional_motoristas`.
  - Agendamento da 3 Corações em 07/10/2026 normalizado para **0 recursos alocados** (em vez de 163).
  - KPIs Gerais do topo da Torre somam com precisão toda a capacidade ativa da frota (incluindo SPOTs livres em `Disponíveis`).

### Mudança de Status em Massa & Ação Rápida
- **Operação em Lote na Página de Status do Motorista**:
  - Adicionadas caixas de seleção (checkboxes individuais e seleção global no cabeçalho) com barra contextual de ações em lote.
  - Implementado Drawer lateral conectado ao endpoint `POST /api/v1/operacao/status-lote`, permitindo alterar múltiplos motoristas simultaneamente com validação atômica e justificativa obrigatória para `INDISPONIVEL`.
  - Adicionado banner com ação inteligente de 1 clique para converter todos os motoristas com status "Sem Alocação" para "Disponível" (executada migração dos 156 motoristas pendentes).

### Versionamento Oficial Estrito de Agendamento (v0 $\rightarrow$ v1 ao Salvar)
- **Eliminação de Incrementos Prematuros**:
  - O agendamento é criado com `versao = 0` (pendente de consolidação).
  - Micro-ações intermediárias (adicionar SPOT, substituir SPOT, remover SPOT, trocar veículo provisório, alterar status) mantêm a versão inalterada.
  - Implementado o botão `"Salvar Agendamento"` no cabeçalho e endpoint `POST /api/v1/agendamentos/{id}/salvar-versao`: o primeiro salvamento oficializa a versão `v1`, e salvamentos deliberados subsequentes avançam consecutivamente (`v2`, `v3`...).
  - Histórico de versões ajustado no frontend para renderizar o badge de versão oficial apenas em eventos `NOVA_VERSAO`.

### Filtragem Inteligente no Detalhamento Operacional da Torre
- **Foco na Execução**:
  - A tabela "Detalhamento Operacional dos Recursos" passa a exibir exclusivamente recursos da categoria `DEDICADO` (todos os status) e recursos da categoria `SPOT` que foram agendados (`PROGRAMADO`) ou estão em rota (`EM_ROTA`).
  - Recursos SPOT livres (`DISPONIVEL`, `SEM_ALOCACAO`) ficam ocultos desta tabela, limpando a tela de ruído e focando na operação do dia.

### Refinamento de Interface & Limpeza Visual
- **Header Limpo**:
  - Removida a tag fixa `"API Conectada"` do cabeçalho da aplicação (`frontend/src/components/navigation/Header.tsx`).
- **Compactação de Tabelas**:
  - Renomeada coluna `"Empresa Contratante"` para `"Empresa"`.
  - Aplicada estilização compacta com redução de padding e largura inteligente nas colunas, mantendo a coluna de Status visível sem scroll horizontal forçado.
- **Alternância Rápida de Status**:
  - Badges de status nas telas de Empresas e Usuários convertidos em botões interativos (`<StatusBadge>`) para alternância direta em 1 clique.
  - Removido atributo `disabled` da opção vazia no componente `<Select>`, permitindo limpar filtros e voltar para "(Todos)".

### Infraestrutura & Resolução de Rede
- **Fixação em IPv4 no Frontend**:
  - `VITE_API_URL` configurado para `http://127.0.0.1:8000` (e target de proxy no `vite.config.ts`), eliminando erro HTTP 404 no login decorrente de colisão com container Docker local escutando em `[::1]:8000`.

### Validação de Testes
- Suíte Vitest (Frontend): **43 passed (100% verde)**.
- Suíte Pytest (Backend): **76 passed (100% verde)**.

---

## [2026-09-30] Fase 5.1 — White Label, Design Industrial Flat e Governança Operacional
- **Identidade Visual White Label**:
  - Tema claro e bordas estritamente retas (`rounded-none`, `border-radius: 0 !important`).
  - Fundo neutro (`bg-slate-100` / `bg-slate-50`) e cards em branco puro (`bg-white border-slate-200`).
- **Scripts de Recuperação e Limpeza**:
  - Implementado `scripts/recriar_vinculos_motoristas_veiculos.py` para pareamento inteligente por planilha mestre.
  - Implementado `scripts/remover_empresas_usuarios.py` para exclusão seletiva e segura com checagem referencial.
  - Implementado `scripts/limpar_dados_operacionais.py` para purge transacional com flags de escopo granular.
- **Diferenciação Visual de Perfil**:
  - Perfil SECO em vermelho (`text-red-500 font-bold`) e REFRIGERADO em azul (`text-blue-500 font-bold`).
- **Janela de Agendamentos Parametrizável**:
  - Suporte a agendamentos D+0 sem bloqueio de horário e antecedência configurável.
