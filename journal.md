# Diário de Bordo — Torre de Controle Logtudo

## [2026-10-07] Desacoplamento de Status SPOT, Versionamento Oficial de Agendamento, Ações em Lote e Refinamento de UI

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
