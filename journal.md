# Diário de Bordo — Torre de Controle Logtudo

## [2026-10-07] Desacoplamento de Status SPOT, Versionamento Oficial de Agendamento, Ações em Lote e Refinamento de UI

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
