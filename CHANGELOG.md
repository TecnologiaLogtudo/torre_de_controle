# Changelog

Todas as alterações relevantes para este projeto serão documentadas neste arquivo.

O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Adicionado & Corrigido (Desacoplamento de Status SPOT e Isolamento por Empresa)
- **Desacoplamento do Status Operacional de Motoristas SPOT (`app/operacao/models.py`, `app/operacao/services.py`, `tests/test_status_motoristas.py`)**:
  - Criado o modelo e tabela `status_operacional_motoristas` com índice único `(motorista_id, data)` para armazenar o status operacional diário de motoristas SPOT de forma independente, sem necessidade ou dependência de atrelamento a um `Agendamento` ou empresa contratante.
  - Flexibilizadas as colunas `empresa_id` e `veiculo_id` na tabela `eventos_operacionais` para `nullable=True`, garantindo trilha de auditoria completa mesmo em transições de status de recursos livres.
  - Refatorados `alterar_status_motorista`, `atualizar_status_lote`, `obter_resumo_por_empresa` e `obter_resumo_geral`:
    - Recursos SPOT disponíveis ou indisponíveis permanecem no pool geral de frota livre sem vínculo com empresas parceiras.
    - A tabela **Situação Operacional por Empresa** agora consolida exclusivamente recursos dedicados/contratados ou SPOTs formalmente agendados (`PROGRAMADO`) ou em rota (`EM_ROTA`) para a respectiva empresa, eliminando a exibição errônea de SPOTs livres na linha de empresas parceiras (ex: 3 Corações).
    - Os **KPIs Gerais** do topo da Torre de Controle continuam contabilizando toda a frota ativa (recursos dedicados e SPOTs livres de acordo com o status operacional diário).
    - Executada limpeza corretiva de alocações indevidas no banco de dados e migração para `status_operacional_motoristas`, regularizando o agendamento da 3 Corações em 07/10/2026 de 163 recursos para 0 recursos alocados.
- **Resolução de Conflito de Endereçamento de Login Local (`frontend/.env`, `frontend/vite.config.ts`)**:
  - Fixado `VITE_API_URL` e proxy do Vite em `http://127.0.0.1:8000`, prevenindo colisão de portas entre o IPv6 `[::1]:8000` (usado por containers Docker locais) e o Uvicorn no IPv4.

### Adicionado & Corrigido (Melhorias Operacionais do Cockpit & Agendamentos)
- **Correção no Filtro de Seleção (`frontend/src/components/ui/Select.tsx`)**:
  - Removido o atributo `disabled` da opção padrão/vazia do componente `<Select />` (`<option value="">{placeholder}</option>`), permitindo que operadores limpem filtros e retornem à visualização completa `(Todos)` após realizar uma filtragem.
- **Formatação de Data Operacional no Agendamento (`frontend/src/utils/date.ts`, `AgendamentosPage.tsx`)**:
  - Ajustada a função `formatDateBahia` para exibir exclusivamente a data no padrão brasileiro `DD/MM/AAAA` (sem carimbo de horas `HH:mm`) e sem sofrer distorção para o dia anterior decorrente da interpretação UTC de strings `YYYY-MM-DD`.
  - Atualizada a listagem de agendamentos (`AgendamentosPage.tsx`) para apresentar a Data Operacional limpa.
- **Alternância Rápida de Status em Empresas e Usuários (`EmpresasPage.tsx`, `UsuariosPage.tsx`, `StatusBadge.tsx`)**:
  - Convertido o badge de status das tabelas de Empresas e Usuários para o componente interativo `<StatusBadge>`, permitindo que administradores cliquem diretamente no badge para alternar o status (`ATIVO` / `INATIVO`) com feedback imediato via toast e atualização reativa da listagem.
- **Expansão do Limite de Motoristas na API e Consultas (`app/motoristas/routers.py`, `app/motoristas/services.py`, `motoristasService.ts`, `app/operacao/routers.py`, `app/operacao/services.py`)**:
  - Elevado o limite padrão e máximo de listagem de motoristas de 50 para 1000 registros, garantindo que motoristas cadastrados além do 50º registro não sejam arbitrariamente truncados da tela ou das alocações SPOT.
- **Filtro de Motoristas Ocupados na Escala de Agendamento (`useAgendamentoDetalhes.ts`)**:
  - Aprimorada a listagem de `motoristasSpotElegiveis` para ocultar automaticamente motoristas que já estejam com status operacional `PROGRAMADO`, `EM_ROTA` ou `INDISPONIVEL` na data do agendamento, prevenindo conflitos e dupla alocação antes mesmo da submissão.
- **Cockpit em Tempo Real da Torre de Controle (`TorreHeader.tsx`, `TorrePage.tsx`)**:
  - Removido o input seletor de data da Torre de Controle, fixando a tela no dia corrente (`hoje`) com indicador visual vivo em verde ("Hoje: DD/MM/AAAA"). Consultas retroativas ou futuras são direcionadas à tela de Agendamentos.
- **Alteração de Status Operacional em Lote (`app/operacao/schemas.py`, `app/operacao/services.py`, `app/operacao/routers.py`, `torreService.ts`, `DetalhamentoTorre.tsx`, `AgendamentoDetalhesPage.tsx`)**:
  - Implementado o endpoint `POST /api/v1/operacao/status-lote` com suporte à alteração simultânea por `alocacao_ids` e `motorista_ids`, com validação atômica, justificativa obrigatória para `INDISPONIVEL` e trilha de auditoria completa em `eventos_operacionais`.
  - Adicionadas caixas de seleção (checkboxes individuais e seleção global), barra de controle de seleção e Drawer dedicado tanto na tela de detalhes do agendamento quanto no detalhamento da Torre de Controle.
- **Botão Salvar Agendamento & Versionamento Oficial Estrito (`app/agendamentos/services.py`, `app/operacao/services.py`, `app/agendamentos/routers.py`, `agendamentosService.ts`, `AgendamentoDetalhesPage.tsx`)**:
  - Implementado o endpoint `POST /api/v1/agendamentos/{agendamento_id}/salvar-versao` e o botão `"Salvar Agendamento"` no cabeçalho do agendamento.
  - Eliminados os incrementos automáticos prematuros de versão que ocorriam a cada micro-ação intermediária (`adicionar_spot`, `substituir_spot`, `remover_spot`, `trocar_veiculo_dedicado`, `atualizar_status_operacional`). A criação agora nasce em `versao = 0` (pendente de salvar). O primeiro salvamento oficializa a versão `v1`, e salvamentos subsequentes avançam consecutivamente (`v2, v3...`).
  - Corrigida a renderização do histórico no frontend (`AgendamentoDetalhesPage.tsx`), removendo a numeração artificial sequencial (`v{total - idx}`) que rotulava cada micro-ação como uma versão separada. Agora, as badges de versão oficial são reservadas exclusivamente para `NOVA_VERSAO` (`v1, v2, v3...`) disparadas pelo salvamento deliberado do operador.
- **Compactação e Ajuste do Detalhamento Operacional (`DetalhamentoTorre.tsx`, `Table.tsx`, `AgendamentosPage.tsx`)**:
  - Renomeado o cabeçalho da coluna `"Empresa Contratante"` para `"Empresa"` nas tabelas da Torre de Controle e de Agendamentos.
  - Adicionada propriedade `compact` aos componentes de cabeçalho (`TableHeadCell`) e célula (`TableCell`), reduzindo o padding para `px-2.5 py-1.5`.
  - Removida a exibição da identificação interna na coluna 'Veículo / Placa' (apresentando apenas `{tipo_veiculo} [{placa}]`).
  - Achada e compactada a tabela com larguras truncadas inteligentes em colunas secundárias e `whitespace-nowrap`, garantindo a visibilidade imediata da coluna 'Status Operacional' sem necessidade de rolagem horizontal desnecessária.
- **Alteração Individual de Status na Torre de Controle (`DetalhamentoTorre.tsx`, `torre.test.tsx`)**:
  - Implementada funcionalidade de alterar o status operacional diretamente pela página principal da Torre de Controle, permitindo clicar no badge de status ou no botão de ação rápida da linha.
  - Adicionado Drawer lateral dedicado para seleção do novo status operacional (`DISPONIVEL`, `PROGRAMADO`, `EM_ROTA`, `INDISPONIVEL`), com obrigatoriedade de motivo para indisponibilidade e feedback imediato via toast.
  - Atualização reativa de toda a Torre de Controle (cards executivos, resumo por empresa e detalhamento) após a confirmação da alteração.
- **Mudança de Status em Massa na Página "Status do Motorista" (`StatusMotoristasPage.tsx`, `statusMotoristas.test.tsx`)**:
  - Implementada funcionalidade de seleção múltipla de motoristas (checkboxes individuais e global no cabeçalho da tabela) com barra contextual de ações em lote.
  - Implementado Drawer lateral dedicado para alteração de status em massa (`DISPONIVEL`, `INDISPONIVEL` com motivo obrigatório e `SEM_ALOCACAO`), conectado ao endpoint `/api/v1/operacao/status-lote`.
  - Adicionado banner com ação rápida inteligente para selecionar ou converter diretamente todos os motoristas `SEM_ALOCACAO` para `DISPONIVEL` em 1 clique.
  - Executada a migração/atualização em lote na base de dados, convertendo todos os 156 motoristas com status "Sem Alocação" para o status "Disponível".
- **Filtragem de Recursos no Detalhamento Operacional da Torre (`app/operacao/services.py`, `DetalhamentoTorre.tsx`, `test_torre_e_operacao_completa.py`)**:
  - Restrita a listagem da tabela "Detalhamento Operacional dos Recursos" para exibir exclusivamente:
    1. Motoristas de categoria `DEDICADO` (em qualquer status operacional);
    2. Recursos de categoria `SPOT` que foram agendados (`PROGRAMADO`) ou estão em rota (`EM_ROTA`).
  - Recursos SPOT livres ou ociosos (`DISPONIVEL`, `SEM_ALOCACAO`) ficam ocultos desta tabela, focando o detalhamento estritamente na execução contratual e agendada da data.
  - Implementado tanto no backend (via cláusula SQL otimizada no `obter_detalhamento_operacional`) quanto no frontend (`detalhamentoVisivel`), com teste automatizado de cobertura `test_detalhamento_torre_filtra_spots_disponiveis`.
- **Testes Automatizados de Regressão**:
  - Atualizado `tests/test_agendamentos.py` e criado `tests/test_status_lote_e_versao.py` garantindo que o agendamento nasce em `v0`, que adições SPOT e alterações de status mantêm a versão inalterada, e que o primeiro acionamento de `salvar-versao` oficializa a `v1`.

### Adicionado (Status Operacional de Motoristas)
- **Alteração Direta de Status na Página "Status do Motorista" (`StatusMotoristasPage.tsx`, `torreService.ts`, `app/operacao/routers.py`, `app/operacao/services.py`, `app/operacao/schemas.py`)**:
  - Implementado Drawer lateral e botão de ação rápida "Alterar Status" (além de clique direto no badge de status) para alterar o status operacional (`DISPONIVEL`, `PROGRAMADO`, `EM_ROTA`, `INDISPONIVEL`, `SEM_ALOCACAO`) de motoristas ativos na data selecionada.
  - **Regra de Negócio para Categoria SPOT**: Como motoristas SPOT operam sob demanda e não possuem vínculo fixo com uma empresa, os status `PROGRAMADO` e `EM_ROTA` ficam estritamente bloqueados nesta tela (com botões desabilitados, etiqueta informativa de requerimento de agendamento e validação `HTTP 400` no backend). Para escalá-los em uma rota, o operador deve vinculá-los formalmente via tela de Agendamentos.
  - Motoristas SPOT podem ser alternados entre `DISPONIVEL` (disponíveis para escala), `INDISPONIVEL` (com motivo obrigatório) e `SEM_ALOCACAO`, mantendo o vínculo com empresa nulo na exibição consolidada.
  - Motoristas da categoria `DEDICADO` (com empresa fixa vinculada) mantêm acesso a todos os 5 status operacionais.
  - Trilha de auditoria operacional gravada na tabela `eventos_operacionais` a cada transição de status.
  - Testes automatizados cobrindo tanto as transições válidas quanto os bloqueios de motoristas SPOT no backend (`tests/test_status_motoristas.py`) e no frontend (`frontend/src/test/statusMotoristas.test.tsx`).

### Modificado (Cadastro e Gestão de Veículos)
- **Remoção da Obrigatoriedade de Identificação Interna de Veículos (`app/veiculos/schemas.py`, `app/veiculos/services.py`, `app/veiculos/routers.py`, `frontend/src/types/veiculos.ts`, `VeiculosPage.tsx`)**:
  - Tornado opcional o campo `identificacao` nos schemas de criação e atualização de veículos no backend, adotando fallback automático para a `placa` quando omitido para preservar a integridade e unicidade do banco de dados sem necessidade de migração física.
  - Removido o campo obrigatório "Identificação Interna / Prefixo" do formulário de cadastro e edição de veículos (Drawer) no frontend.
  - Removida a coluna redundante "Identificação Interna" da tabela de veículos, mantendo a placa em destaque como identificador único principal.
  - Aprimorada a formatação dos seletores de veículos em `MotoristasPage.tsx`, `ContratosPage.tsx` e `AgendamentoDetalhesPage.tsx` para evitar repetição visual desnecessária quando a identificação for omitida ou coincidir com a placa.
  - Adicionado teste automatizado de regressão cobrindo criação e atualização de veículos sem identificação em `tests/test_fluxo_completo.py`.

### Adicionado (Vínculo e Correlação Direta Motorista-Veículo)
- **Vinculação Direta de Veículo na Gestão de Motoristas (`MotoristasPage.tsx`)**:
  - Adicionado botão de ação rápida `"Vincular Veículo"` / `"Alterar Veículo"` em cada linha da tabela de motoristas.
  - Implementado Drawer dedicado permitindo vincular qualquer veículo da frota física a um motorista, com suporte tanto a recursos **SPOT** (livre, sem necessidade de empresa ou contrato) quanto **DEDICADO** (associado a empresa contratante).
  - Adicionado botão para `"Desvincular Veículo Atual"`, liberando o motorista de volta para SPOT livre sem veículo associado.
- **Vinculação Direta de Motorista na Gestão de Veículos (`VeiculosPage.tsx`)**:
  - Adicionado botão de ação rápida `"Vincular Motorista"` / `"Alterar Motorista"` em cada linha da tabela de veículos.
  - Implementado Drawer dedicado permitindo vincular motoristas disponíveis ao veículo físico selecionado, com opção de desvinculação direta.
- **Atualização Direta de Vínculos SPOT no Backend (`app/contratos/services.py`)**:
  - Flexibilizado `criar_vinculo_motorista` para permitir a atualização direta de veículo em registros SPOT existentes (sem necessidade de desativação manual prévia), com validação contra veículos já em uso ativo por outro motorista e trilha de auditoria completa.
  - Suporte à transição direta DEDICADO -> SPOT.
- **Testes Automatizados de Regressão e Validação**:
  - Criados testes unitários no backend em `tests/test_contratos_vinculos_spot.py` cobrindo a atualização direta de veículo SPOT e o bloqueio de duplicidade de veículo.
  - Adicionados testes de integração no frontend em `src/test/fase_4_2_modulos.test.tsx` garantindo a correta abertura dos Drawers e o envio dos payloads de vinculação SPOT.

### Corrigido (Listagem de Veículos & Paginação)
- **Elevação do Limite e Ordenação de Veículos (`app/veiculos/services.py`, `app/veiculos/routers.py`, `veiculosService.ts`, `VeiculosPage.tsx`, `MotoristasPage.tsx`, `ContratosPage.tsx`, `useAgendamentoDetalhes.ts`)**:
  - Elevado o limite padrão de consulta de 50 para 1000 registros tanto no backend quanto no frontend, resolvendo o problema onde veículos cadastrados além do 50º registro ficavam omitidos da listagem e da busca.
  - Adicionada ordenação decrescente por data de criação (`.order_by(Veiculo.criado_em.desc())`), garantindo que veículos recém-cadastrados apareçam imediatamente no topo da tabela.

### Corrigido (Deploy & Roteamento Reverso)
- **Compatibilidade com Proxy Reverso e Traefik no Coolify (`app/main.py`)**:
  - Implementado suporte de dupla resolução nos roteadores da API para responderem tanto sob `/api/v1` quanto sob `/v1` (prefixo reduzido decorrente de `stripprefix` do Traefik no Coolify quando mapeado em `/api`), eliminando o erro 404 em chamadas como `/api/v1/auth/login`.
  - Adicionado endpoint compatível `/v1/openapi.json` para garantir o funcionamento do Swagger UI sob `root_path="/api"`.
- **Normalização e Resiliência de CORS (`app/core/config.py`)**:
  - `BACKEND_CORS_ORIGINS` aprimorado com extração automática de `scheme://host` (removendo caminhos como `/api` que são desconsiderados por navegadores em cabeçalhos `Origin`).
  - Adicionada suíte de testes unitários em `tests/test_config.py`.
- **Validação de Identificação de Empresas (`app/empresas/schemas.py`)**:
  - Ajustado `min_length` de `identificacao` para 1 (anteriormente exigia 11 caracteres), permitindo que empresas com códigos ou slugs curtos (ex: "3C", "LACTALIS", "EMP-01") sejam serializadas sem gerar erro de validação Pydantic (HTTP 500) na listagem de empresas (`GET /api/v1/empresas`).
- **Favicon Oficial e Caminho Relativo (`frontend/index.html` e `frontend/public/favicon.svg`)**:
  - Criado o arquivo `favicon.svg` com a identidade visual no diretório `public/` e ajustado o caminho no HTML para `./favicon.svg`, eliminando o erro HTTP 503 decorrente de busca indevida no domínio raiz.
- **Fixação da Sidebar no Layout Desktop (`ApplicationLayout.tsx` e `Sidebar.tsx`)**:
  - Sidebar configurada com posicionamento fixo (`fixed inset-y-0 left-0 w-64 z-30`) e compensação no container de conteúdo principal (`md:pl-64`), garantindo que permaneça imóvel durante a rolagem vertical de qualquer página da aplicação.

## [1.2.0] — 2026-09-30 (Fase 5.1 — White Label, Versionamento & Governança Operacional)

### Adicionado & Consolidado (Fase 5.1)

- **Script de Recuperação de Vínculos Motoristas-Veículos (`scripts/recriar_vinculos_motoristas_veiculos.py`)**:
  - Utilitário para restabelecer os vínculos e a correlação entre motoristas e veículos na tabela `motoristas_dedicados_vinculos` a partir da planilha mestre (`motoristas_3c_lactalis.xlsx` ou arquivo customizado).
  - Pareamento inteligente por nome de motorista e placa de veículo com suporte a categorias `DEDICADO` e `SPOT`, idempotência contra duplicidades ativas e opção `--dry-run`.
  - Auto-redirecionamento para `.venv` e suíte de testes unitários em `tests/test_script_recriar_vinculos.py`.

- **Script Interativo de Remoção de Empresas e Usuários (`scripts/remover_empresas_usuarios.py`)**:
  - Utilitário interativo com menu de seleção (numérico por vírgula, CNPJ/e-mail ou 'TODAS') e suporte a flags CLI para exclusão seletiva de empresas e usuários.
  - Verificação prévia de integridade referencial (`RESTRICT` em agendamentos/eventos), trava de segurança contra exclusão do único usuário do sistema e opção `--cascade-dependentes`.
  - Suporte a modo `--dry-run`, auto-redirecionamento para `.venv` e suíte de testes unitários em `tests/test_script_remover_empresas_usuarios.py`.

- **Script Utilitário de Limpeza de Dados Operacionais (`scripts/limpar_dados_operacionais.py`)**:
  - Implementado script em linha de comando para exclusão transacional segura de todos os agendamentos (`agendamentos`, `alocacoes_operacionais`, `historico_agendamentos`), contratos (`contratos_configuracoes`) e vínculos entre motoristas e empresas (`motoristas_dedicados_vinculos`).
  - Ordem de exclusão em conformidade com as restrições de chave estrangeira (`RESTRICT` e `CASCADE`).
  - Suporte a modo `--dry-run` para simulação sem persistência, `--force` (`-y`) para automação sem prompt interativo e flags para escopo granular (`--apenas-agendamentos`, `--apenas-contratos`, `--apenas-vinculos`, `--limpar-eventos`).
  - Adicionada suíte de testes unitários em `tests/test_script_limpar_dados.py`.

  - **Identidade White Label & Design Plano (Flat Sharp)**:
    - Fundo unificado em tom claro suave (`bg-slate-100` / `bg-slate-50`), superfícies e cards em branco puro (`bg-white border-slate-200 shadow-sm`), tipografia nítida em alto contraste (`text-slate-900` / `text-slate-700`).
    - Supressão total de bordas arredondadas em toda a aplicação (`border-radius: 0 !important;` e `rounded-none`), atendendo à diretriz de design industrial plano.
    - Badges semânticos em tons pastel legíveis e contrastantes (Verde esmeralda para `Disponível`/`Ativo`, Azul sky para `Programado`, Âmbar para `Em Rota`, Vermelho rose para `Indisponível`/`Inativo`).
  - **Torre de Controle (Cockpit Operacional)**:
    - Campo *"Última atualização: DD/MM/AAAA HH:mm:ss"* reposicionado **abaixo** do seletor de data e botão de atualização em [TorreHeader.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/torre/components/TorreHeader.tsx).
    - Filtros da tabela de detalhamento da frota alinhados na **horizontal** em [DetalhamentoTorre.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/torre/components/DetalhamentoTorre.tsx).
    - KPIs e Resumo por Empresa migrados para superfícies claras com bordas de destaque.
  - **Agendamentos e Detalhes da Programação**:
    - Filtros de agendamentos reorganizados em linha **horizontal** em [AgendamentosPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/agendamentos/pages/AgendamentosPage.tsx).
    - Botão `+ Cobrir Vaga com SPOT` **desabilitado/bloqueado** com badge informativa `"Vaga Coberta por SPOT"` quando uma vaga com indisponibilidade já tiver sido preenchida por um recurso SPOT.
    - Histórico de alterações da programação em **ordem decrescente** (mais recente primeiro) exibindo a versão da mudança (`v1, v2, ...`).
    - Resolução automática de UUIDs no Histórico: exibição clara do **nome do motorista e veículo com placa formatada** em vez de identificadores alfanuméricos brutos.
  - **Cadastros e Configurações (Filtros Horizontais & Motoristas Inativos)**:
    - **Gestão de Motoristas ([MotoristasPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/motoristas/pages/MotoristasPage.tsx))**: Inclusão de seletor de status (`Status (Todos)`, `Apenas Ativos`, `Apenas Inativos`) permitindo que **motoristas inativos apareçam na listagem**, com filtros alinhados horizontalmente e paginação ampliada.
    - **Empresas, Veículos, Usuários e Motivos de Indisponibilidade**: Todos os filtros migrados para alinhamento horizontal lado a lado e tema White Label.
    - **Status de Motoristas ([StatusMotoristasPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/motoristas/pages/StatusMotoristasPage.tsx))**: Cards interativos e filtros em layout horizontal claro.
  - **Central de Operação & Eventos ([HistoricoEventosPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/operacao/pages/HistoricoEventosPage.tsx))**:
    - Filtros horizontais alinhados e consolidação de métricas e tabela em tema claro White Label.
  - **Qualidade e Testes**:
    - Suíte de 38 testes automatizados do Vitest 100% verde (`npm test`).
    - Tipagem TypeScript estrita sem erros de compilação.

- **Melhorias de Agendamento, Versionamento Consecutivo, Troca de Veículo e Cockpit de Motoristas**:
  - **Versionamento Consecutivo do Agendamento**:
    - Adicionado campo `versao: int = 1` no modelo `Agendamento` ([app/agendamentos/models.py](file:///d:/Logtudo/Projetos/torre_de_controle/app/agendamentos/models.py)) e schema ([app/agendamentos/schemas.py](file:///d:/Logtudo/Projetos/torre_de_controle/app/agendamentos/schemas.py)), incrementado consecutivamente (`versao += 1`) a cada mutação (inclusão de SPOT, substituição de SPOT, remoção de SPOT, troca provisória de veículo dedicado, atualização de status operacional e alterações no agendamento).
    - Criada migração Alembic `8b9c0d1e2f3a_adicionar_versao_agendamento.py` e DDL seguro no startup de [app/main.py](file:///d:/Logtudo/Projetos/torre_de_controle/app/main.py) garantindo retrocompatibilidade com bancos pré-existentes.
    - Exibição de badge com a versão (`v1`, `v2`, etc.) na listagem de agendamentos e no cabeçalho da página de detalhes.
  - **Auto-Alocação com Flag de Indisponibilidade (Regra Q2)**:
    - Motoristas dedicados com indisponibilidade ativa na data ou dia anterior são auto-alocados no agendamento com `status_operacional = "INDISPONIVEL"`, preservando o vínculo contratual sem disparar erro HTTP 400.
    - Exibição de banner com alerta de déficit e botão de ação rápida "Cobrir Vaga com SPOT" na página de detalhes do agendamento.
  - **Troca Provisória de Veículo Dedicado (Regra Q5)**:
    - Novo endpoint `PUT /api/v1/agendamentos/alocacoes/{alocacao_id}/trocar-veiculo` e método `trocar_veiculo_dedicado`.
    - Permite a substituição temporária do veículo do motorista dedicado preservando a categoria `DEDICADO` no contrato e auditando a alteração no histórico.
    - Drawer "Trocar Veículo Dedicado Provisoriamente" integrado em [AgendamentoDetalhesPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/agendamentos/pages/AgendamentoDetalhesPage.tsx).
  - **Diferenciação de Cor por Perfil**:
    - Componente [PerfilBadge](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/components/ui/StatusBadge.tsx): perfil **SECO escrito em vermelho** (`text-red-500 font-bold`) e perfil **REFRIGERADO escrito em azul** (`text-blue-500 font-bold`).
    - Propagado para o Cockpit de Status de Motoristas, Detalhamento da Torre de Controle, Cadastro de Veículos e Detalhes de Agendamento.
  - **Cockpit de Status de Motoristas**:
    - Elevado a item de primeiro nível na barra lateral ([Sidebar.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/components/navigation/Sidebar.tsx)).
    - Cards de resumo clicáveis atuando como filtros rápidos (Total, Disponíveis, Programados, Em Rota, Indisponíveis, Sem Alocação), busca por nome e coluna de perfil de veículo em [StatusMotoristasPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/motoristas/pages/StatusMotoristasPage.tsx).
  - **Janela de Agendamentos Parametrizável (Regra Q1)**:
    - Suporte a agendamentos D+0 sem bloqueio de horário e limite futuro parametrizável via chave `dias_antecedencia_maxima_agendamento` (padrão 1 dia, D+0 e D+1).

- **Fase 3: Tipagem Estrita Matt Pocock & Extração de Hooks Operacionais**:
  - **Eliminação Completa de `any` no Frontend**: Substituídos 100% dos blocos `catch (err: any)` e type casts inseguros `as any` por `catch (err: unknown)` com type-narrowing rigoroso via `getErrorMessage` e `isApiError` em [errors.ts](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/services/api/errors.ts).
  - **Sobrecargas e Discriminação de Retorno em Services**: Implementadas sobrecargas em `agendamentosService.listar` ([agendamentosService.ts](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/services/agendamentos/agendamentosService.ts)) discriminando em tempo de compilação o retorno `AgendamentoPaginadoResponse` para `paginado: true` e `Agendamento[]` para requisições simples, eliminando verificações de runtime redundantes (`'items' in res`) e type casts manuais em [AgendamentosPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/agendamentos/pages/AgendamentosPage.tsx).
  - **Extração do Hook `useAgendamentoDetalhes`**: Extraídas mais de 340 linhas de lógica densa de orquestração, regras de elegibilidade SPOT, submissão de formulários e estados assíncronos de [AgendamentoDetalhesPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/agendamentos/pages/AgendamentoDetalhesPage.tsx) para o hook customizado [useAgendamentoDetalhes.ts](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/agendamentos/hooks/useAgendamentoDetalhes.ts).
  - **Extração do Hook `useTorreOperacional`**: Encapsulado o ciclo de vida, filtros em `America/Bahia`, polling e sincronização multientidade da Torre de Controle no hook [useTorreOperacional.ts](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/torre/hooks/useTorreOperacional.ts), simplificando [TorrePage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/torre/pages/TorrePage.tsx) para uma camada puramente declarativa de apresentação.
  - **Padronização de Tratamento de Erros nos Módulos**: Tratamento seguro propagado para [ContratosPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/contratos/pages/ContratosPage.tsx), [MotoristasPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/motoristas/pages/MotoristasPage.tsx), [StatusMotoristasPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/motoristas/pages/StatusMotoristasPage.tsx), [VeiculosPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/veiculos/pages/VeiculosPage.tsx), [EmpresasPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/empresas/pages/EmpresasPage.tsx), [UsuariosPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/usuarios/pages/UsuariosPage.tsx), [MotivosIndisponibilidadePage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/operacao/pages/MotivosIndisponibilidadePage.tsx), [HistoricoEventosPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/operacao/pages/HistoricoEventosPage.tsx) e [ImportModal.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/components/ui/ImportModal.tsx).


- **Fase 2: Infraestrutura de Feedback & Toasts (Sonner Logtudo)**:
  - **Instalação e Customização do Sonner**: Instalada a biblioteca `sonner` e criado o componente [Toaster.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/components/feedback/Toaster.tsx) estilizado com o design system Logtudo (`#185772`, `#0F2C3A`, `#6ca8c2`, esmeralda e âmbar), com animação fluida, acessibilidade WAI-ARIA e `z-[9999]`.
  - **Container Global no App**: Integrado `<Toaster />` no nível raiz em [App.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/App.tsx).
  - **Integração de Notificações em Tempo Real nas Mutações**:
    - [AgendamentosPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/agendamentos/pages/AgendamentosPage.tsx): Notificação com data e empresa após criação de agendamento.
    - [AgendamentoDetalhesPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/agendamentos/pages/AgendamentoDetalhesPage.tsx): Feedback tátil ao adicionar, substituir ou remover recursos SPOT, alterar status operacional e cancelar agendamentos.
    - [MotoristasPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/motoristas/pages/MotoristasPage.tsx): Confirmação de cadastro, edição e alternância de status ativo/inativo.
    - [VeiculosPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/veiculos/pages/VeiculosPage.tsx): Confirmação de cadastro, edição e alternância de status ativo/inativo de veículos.
    - [ContratosPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/contratos/pages/ContratosPage.tsx): Feedback imediato no registro de capacidade contratual, associação e desativação de vínculos dedicados.
    - [EmpresasPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/empresas/pages/EmpresasPage.tsx), [UsuariosPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/usuarios/pages/UsuariosPage.tsx) e [MotivosIndisponibilidadePage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/operacao/pages/MotivosIndisponibilidadePage.tsx): Feedback em todas as operações de cadastro e atualização.
  - **Suíte de Testes Automatizados**: Criada suíte [toast.test.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/test/toast.test.tsx) validando renderização, disparo de `toast.success` e mensagens descritivas de erro operacional com 100% de sucesso.

- **Infraestrutura e Deploy Multi-Container (Coolify / Docker Compose)**:
  - **Containerização do Frontend React SPA**: Criado [frontend/Dockerfile](file:///D:/Logtudo/Projetos/torre_de_controle/frontend/Dockerfile) multi-estágio (`node:20-alpine` para build e `nginx:alpine` para runtime em produção) e a configuração [frontend/nginx.conf](file:///D:/Logtudo/Projetos/torre_de_controle/frontend/nginx.conf) com suporte a rotas do React Router (`try_files`), compressão Gzip e cache de ativos estáticos.
  - **Orquestração Docker Compose**: Atualizado [docker-compose.yml](file:///D:/Logtudo/Projetos/torre_de_controle/docker-compose.yml) para orquestrar os 3 serviços (`db` PostgreSQL, `web` FastAPI Backend na porta 8000 e `frontend` Nginx na porta 80).
  - **Resiliência da URL do Banco de Dados no Backend**: Adicionado `@model_validator` em [app/core/config.py](file:///D:/Logtudo/Projetos/torre_de_controle/app/core/config.py) para que a `DATABASE_URL` seja automaticamente construída a partir de `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_SERVER`, `POSTGRES_PORT` e `POSTGRES_DB` caso não seja declarada individualmente.
  - **Documentação de Variáveis de Ambiente**: Atualizado [.env.example](file:///D:/Logtudo/Projetos/torre_de_controle/.env.example) incluindo a nova variável do frontend `VITE_API_URL` e instruções claras para configuração no Coolify.

- **Status nas Páginas de Cadastro de Motoristas e Veículos**:
  - Alterada a exibição do status nas tabelas de cadastro em [MotoristasPage.tsx](file:///D:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/motoristas/pages/MotoristasPage.tsx) e [VeiculosPage.tsx](file:///D:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/veiculos/pages/VeiculosPage.tsx) de `Disponível` / `Indisponível` para `Ativo` / `Inativo`, representando adequadamente a situação cadastral perante a empresa.
  - Implementada a funcionalidade de alteração direta do status com 1 clique sobre o badge `StatusBadge` nas listas de motoristas e veículos.
  - Atualizado o componente [StatusBadge.tsx](file:///D:/Logtudo/Projetos/torre_de_controle/frontend/src/components/ui/StatusBadge.tsx) com suporte aos status `ATIVO` e `INATIVO` e propriedades de clique interativo.

- **Pacote de Regras de Negócio e Bloqueios Operacionais (Torre de Controle)**:
  - **Fase 1: Módulo de Contratos e Capacidade**:
    - **Regra 2 (Ocultação de Dedicados)**: Motoristas e veículos já associados a vínculos dedicados ativos com qualquer empresa são ocultados dos seletores do modal de novos vínculos dedicados.
    - **Regra 4 (Exigência de Capacidade Ativa)**: Bloqueio estrito (HTTP 400 no backend e banner informativo na interface) caso o operador tente vincular dedicados para uma empresa sem configuração de capacidade vigente ativa.
    - **Regra 5 (Compatibilidade de Tipo de Veículo)**: Apenas veículos de tipos contratados na capacidade ativa aparecem elegíveis para vínculo dedicado.
    - **Regra 6 (Teto de Vagas Contratadas)**: Validação e bloqueio caso a quantidade de vínculos dedicados ativos para aquele tipo de veículo atinja o limite contratado (`vagas_preenchidas >= vagas_contratadas`).
    - **Regra 7 (Compatibilidade de Especialidade)**: Validação contra capacidades que exigem câmaras frigoríficas (`REFRIGERADO` ou `CONGELADO`), impedindo alocação de veículos incompatíveis (`SECO`).
  - **Fase 2: Cadastros e Desativação em Cascata**:
    - **Regra 10 (Encerramento em Cascata)**: Ao inativar um motorista ([app/motoristas/services.py](file:///d:/Logtudo/Projetos/torre_de_controle/app/motoristas/services.py)) ou um veículo ([app/veiculos/services.py](file:///d:/Logtudo/Projetos/torre_de_controle/app/veiculos/services.py)) no cadastro geral, todos os seus vínculos contratuais dedicados ativos são imediatamente inativados e auditados em cascata.
  - **Fase 3: Motor Operacional e Agendamentos**:
    - **Regras 1 & 3 (Disponibilidade Estrita Hoje e D+1)**: Bloqueio e ocultação automática nos seletores de agendamentos para motoristas/veículos com status diferente de `DISPONIVEL` (status `PROGRAMADO`, `EM_ROTA` ou `INDISPONIVEL` na data ou dia anterior pendente de liberação).
    - **Regra 9 (Liberação Automática no Cancelamento)**: Ao cancelar um agendamento ([app/agendamentos/services.py](file:///d:/Logtudo/Projetos/torre_de_controle/app/agendamentos/services.py)), todas as alocações vinculadas que estavam `PROGRAMADO` retornam automaticamente para `DISPONIVEL`, registrando os respectivos eventos operacionais na central de auditoria.
  - **Suíte de Testes Automatizados**: Criados novos testes unitários e de integração em [test_regras_bloqueio_contratos.py](file:///d:/Logtudo/Projetos/torre_de_controle/tests/test_regras_bloqueio_contratos.py) e [test_regras_bloqueio_operacao.py](file:///d:/Logtudo/Projetos/torre_de_controle/tests/test_regras_bloqueio_operacao.py), mantendo 100% de cobertura verde nas 47 suítes de backend e 29 suítes de frontend.

### Corrigido

- **Fase 1: Correção de Bugs Críticos e Padronização de Timezone (Frontend)**:
  - **Tratamento de Opções no `Intl.DateTimeFormat` ([date.ts](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/utils/date.ts))**: Corrigida a colisão de opções de estilo (`dateStyle` e `timeStyle`) com os parâmetros padrão de componentes (`year`, `month`, etc.), sanando a exceção `TypeError: Invalid option : option` que silenciava a atualização de horário em [TorrePage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/torre/pages/TorrePage.tsx).
  - **Eliminação de Divergência de Fuso Horário Local/UTC**: Criada a função utilitária `getHojeBahiaIso(offsetDays)` garantindo data exata no fuso oficial `America/Bahia` (UTC-3), substituindo chamadas incorretas a `new Date().toISOString().split('T')[0]` em [AgendamentosPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/agendamentos/pages/AgendamentosPage.tsx), [ContratosPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/contratos/pages/ContratosPage.tsx), [HistoricoEventosPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/operacao/pages/HistoricoEventosPage.tsx), [StatusMotoristasPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/motoristas/pages/StatusMotoristasPage.tsx) e [TorrePage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/torre/pages/TorrePage.tsx).
  - **Eliminação de Chamadas Bloqueantes `window.confirm` e `window.alert`**: Substituídas as chamadas de janela em [AgendamentoDetalhesPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/agendamentos/pages/AgendamentoDetalhesPage.tsx) pela integração com o componente controlado [ConfirmDialog.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/components/ui/ConfirmDialog.tsx) e captura de erros em estado reativo.
  - **Consistência de Componentes em Filtros**: Substituído o `<input type="date">` nativo na página [StatusMotoristasPage.tsx](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/motoristas/pages/StatusMotoristasPage.tsx) pelo componente padronizado do Design System `<Input>`.
  - **Expansão da Suíte de Testes de Timezone**: Adicionados testes unitários em [date.test.ts](file:///d:/Logtudo/Projetos/torre_de_controle/frontend/src/test/date.test.ts) cobrindo opções de estilo, descarte de propriedades `undefined` e cálculo de offset de dias em `America/Bahia`.

- **Isolamento de Banco de Dados nos Testes de Concorrência**:
  - Ajustados os arquivos [test_fase_2_9_hardening.py](file:///D:/Logtudo/Projetos/torre_de_controle/tests/test_fase_2_9_hardening.py) e [test_fase_3_consolidacao.py](file:///D:/Logtudo/Projetos/torre_de_controle/tests/test_fase_3_consolidacao.py) para utilizarem a sessão isolada de testes `SessionTesting` em vez de `SessionLocal`.
  - Corrigida a lista `ids_criados` nos testes de concorrência para garantir limpeza total após execução, evitando contaminação de dados no banco de desenvolvimento.

## [1.0.1] - 2026-08-23

### Removido

- **Botão Importar Planilha na Torre de Controle**:
  - Removido o botão *"Importar Planilha"* do cabeçalho da Torre de Controle ([TorreHeader.tsx](file:///D:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/torre/components/TorreHeader.tsx)) e desativado o modal em `TorrePage.tsx`.

### Adicionado

- **Central de Operação & Eventos Operacionais (`/app/operacao`)**:
  - Ativado o menu **Operação** no menu lateral ([Sidebar.tsx](file:///D:/Logtudo/Projetos/torre_de_controle/frontend/src/components/navigation/Sidebar.tsx#L47-L51)) e registrada a rota `/app/operacao` ([router/index.tsx](file:///D:/Logtudo/Projetos/torre_de_controle/frontend/src/app/router/index.tsx#L44)).
  - Criada a página compilada [HistoricoEventosPage.tsx](file:///D:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/operacao/pages/HistoricoEventosPage.tsx) com busca multicritério por Empresa, Categoria (DEDICADO/SPOT), Status, Intervalo de Datas, Nome do Motorista ou Placa do Veículo.
  - Disponibilizados cards de indicadores agregados (Total de Eventos, Indisponibilidades, Recursos em Rota, Programados) e tabela completa com autor da alteração, timestamp `America/Bahia` e justificativa.
  - Adicionadas abas preparadas para a expansão futura do **Monitoramento em Rota (Mapa + Telemetria GPS)**.
- **Blindagem de Exclusividade e Indisponibilidade de Recursos**:
  - Implementadas as validações em `verificar_conflito_alocacao` ([app/agendamentos/services.py](file:///D:/Logtudo/Projetos/torre_de_controle/app/agendamentos/services.py#L67-L118)):
    1. Bloqueio de alocação de motoristas ou veículos marcados como `INDISPONÍVEL` na data.
    2. Bloqueio de alocação de motoristas ou veículos `DEDICADOS` em operações de outras empresas.
    3. Exigência de veículo fixo contratual para motoristas dedicados.
  - Implementada a filtragem inteligente nos dropdowns do modal SPOT ([AgendamentoDetalhesPage.tsx](file:///D:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/agendamentos/pages/AgendamentoDetalhesPage.tsx#L552-L572)), ocultando recursos dedicados a outras empresas ou indisponíveis na data.
  - Adicionado teste automatizado `test_bloqueio_motorista_indisponivel_e_exclusividade_dedicada` em `tests/test_agendamentos.py`.
- **Exibição do Autor do Evento e Recursos no Feed da Torre**:
  - Adicionadas as propriedades dinâmicas `usuario_nome`, `motorista_nome`, `veiculo_placa` e `empresa_nome` em `EventoOperacionalResponse` ([app/operacao/schemas.py](file:///D:/Logtudo/Projetos/torre_de_controle/app/operacao/schemas.py#L78)) e no modelo SQLAlchemy ([app/operacao/models.py](file:///D:/Logtudo/Projetos/torre_de_controle/app/operacao/models.py#L43)).
  - Atualizado o card **Feed de Eventos Operacionais Imutáveis** ([HistoricoEventosTorre.tsx](file:///D:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/torre/components/HistoricoEventosTorre.tsx#L58)) para exibir o nome do motorista e o responsável que efetuou a alteração (*"Alterado por: [Nome do Usuário]"*).
- **Filtro Unificado por Empresa na Torre de Controle**:
  - Atualizado o endpoint `GET /api/v1/operacao/torre/resumo` ([app/operacao/routers.py](file:///D:/Logtudo/Projetos/torre_de_controle/app/operacao/routers.py#L116)) e o serviço `obter_resumo_geral` ([app/operacao/services.py](file:///D:/Logtudo/Projetos/torre_de_controle/app/operacao/services.py#L144)) para aceitar o parâmetro opcional `empresa_id`.
  - Conectada a seleção de empresa feita no card **Situação Operacional por Empresa** em `TorrePage.tsx` aos **KPIs Executivos** (`IndicadoresTorre`) e ao **Feed de Eventos Operacionais Imutáveis** (`HistoricoEventosTorre`), permitindo filtrar toda a página para uma visão refinada por empresa contratante.
- **Trava de Unicidade de Agendamento Diário por Empresa**:
  - Implementada a validação em `AgendamentoService.criar_agendamento` ([app/agendamentos/services.py](file:///D:/Logtudo/Projetos/torre_de_controle/app/agendamentos/services.py#L120-L136)) que proíbe a criação de múltiplos agendamentos ativos para a mesma empresa na mesma data.
  - Adicionado o índice condicional de unicidade `idx_unique_empresa_data_agendamento_ativo` em `Agendamento` ([app/agendamentos/models.py](file:///D:/Logtudo/Projetos/torre_de_controle/app/agendamentos/models.py#L27-L35)) garantindo consistência no banco de dados.
  - Adicionado teste automatizado `test_bloqueio_agendamento_duplicado_mesma_empresa_e_data` em `tests/test_agendamentos.py`.
- **Transição de Status Operacional e Registro de Indisponibilidade na UI**:
  - Adicionado o botão **"Alterar Status Operacional"** / **"Alterar Status"** em cada vaga dedicada e alocação SPOT na tela de Detalhes do Agendamento ([AgendamentoDetalhesPage.tsx](file:///D:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/agendamentos/pages/AgendamentoDetalhesPage.tsx)).
  - Implementada a gaveta lateral (*Drawer*) de transição operacional com validação de regras de transição (`PROGRAMADO`, `EM_ROTA`, `INDISPONÍVEL`, `DISPONÍVEL`) e seleção obrigatória de **Motivo de Indisponibilidade** quando o status for alterado para `INDISPONÍVEL`.

### Corrigido

- **Compatibilidade de Schemas e Payloads de Contratos (BUG-CONTRATOS-422)**:
  - Flexibilizados os schemas Pydantic `ContratoConfiguracaoCreate`, `ContratoConfiguracaoResponse`, `MotoristaDedicadoVinculoCreate` e `MotoristaDedicadoVinculoResponse` em `app/contratos/schemas.py` para harmonizar com as requisições enviadas pelo frontend.
  - Implementada a inferência defensiva de `tipo_veiculo` (a partir do `veiculo_id`) e suporte unificado aos nomes `categoria` / `categoria_operacional` e `regras` / `capacidades`.
  - Atualizados os serviços e formulários no frontend (`contratosService.ts`, `ContratosPage.tsx`) para enviar e processar ambos os formatos sem falhas de validação HTTP 422.

## [1.0.0] - 2026-08-23

### Adicionado & Consolidado (Fase 4.4 — Hardening, Auditoria Final, Integração e Encerramento)

- **Otimização de Performance e Debounce em Filtros**:
  - Implementado debounce de 300ms nos inputs de busca por `motorista_nome` e `placa` no detalhamento da Torre de Controle ([DetalhamentoTorre.tsx](file:///D:/Logtudo/Projetos/torre_de_controle/frontend/src/modules/torre/components/DetalhamentoTorre.tsx)), evitando requisições HTTP redundantes a cada tecla digitada.
- **Acessibilidade e Usabilidade**:
  - Validação e reforço do fechamento por tecla `Escape` em modais e gavetas laterais (`Drawer.tsx`, `Modal.tsx`), atributos `role="dialog"`, `aria-modal="true"` e rótulos `aria-label` nos botões de fechar.
- **Isolamento de Banco de Testes**:
  - Atualizada a fixture `setup_db` em `tests/conftest.py` com `Base.metadata.drop_all(bind=engine_test)` no início da sessão de testes, garantindo execução 100% reproduzível e verde da suíte `pytest` (32 testes).
- **Validações Finais de Qualidade e Integração**:
  - Compilação estrita `tsc && vite build` aprovada com 0 erros.
  - Suíte Vitest frontend aprovada com 27 testes verdes.
  - Suíte Pytest backend aprovada com 32 testes verdes.
  - Atualização e consolidação da documentação em `frontend/README.md`.

## [0.5.0] - 2026-08-21

### Adicionado (Fase 4.3 — Torre de Controle Operacional, Dashboard, Indicadores e Monitoramento)

- **Visualização da Torre de Controle (`/app/torre`)**:
  - Implementada a rota `/app/torre` (substituindo o placeholder inicial) com visualização operacional dividida em hierarquia de decisão (Indicadores Executivos $\rightarrow$ Resumo por Empresa $\rightarrow$ Detalhamento de Frota $\rightarrow$ Feed de Eventos).
- **Indicadores Operacionais Executivos**:
  - Exibição de cards KPI numéricos dominantes consumindo `GET /api/v1/operacao/torre/resumo`: `Contratados`, `Programados`, `Em Rota`, `Disponíveis`, `Indisponíveis` e `Vagas Não Preenchidas` (respeitando estritamente a fórmula do backend: `CONTRATADOS = PROGRAMADOS + EM_ROTA + DISPONÍVEIS + INDISPONÍVEIS + VAGAS_NAO_PREENCHIDAS`).
- **Resumo Operacional por Empresa**:
  - Tabela/card interativo consumindo `GET /api/v1/operacao/torre/empresas-resumo`, permitindo ao operador selecionar uma empresa e filtrar instantaneamente a visão de detalhamento.
- **Detalhamento Operacional de Frota & Filtros Combináveis**:
  - Componente de detalhamento consumindo `GET /api/v1/operacao/torre/detalhamento` com filtros por `placa`, `motorista_nome`, `empresa_id`, `status`, `categoria`, `tipo_veiculo`, `especialidade`, `limite` e `offset`.
- **Feed de Eventos Operacionais Imutáveis**:
  - Painel de auditoria consumindo `GET /api/v1/operacao/historico-eventos` com conversão e exibição de timestamps em `America/Bahia`.
- **Atualização Manual de Dados**:
  - Botão "Atualizar Dados" com timestamp "Última atualização: HH:mm:ss" no fuso `America/Bahia`, preservando filtros selecionados.
- **Concepção Visual via MCP Stitch**:
  - Design da Torre concebido via projeto Stitch `projects/11302205133243501184` com aplicação estrita dos tokens de marca oficial Logtudo.
- **Suíte de Testes Automatizados (Vitest)**:
  - Criado `src/test/torre.test.tsx` com testes de renderização, indicadores, erros da API e gatilho de atualização manual. Suíte total do frontend: 27 testes verdes.

## [0.4.0] - 2026-08-21

### Adicionado (Fase 4.2 — Módulos Operacionais, Cadastros, Configurações e Agendamentos)

- **Identidade Visual Oficial Logtudo**:
  - Aplicação da paleta oficial (#185772, #757675, #6ca8c2, #0F2C3A, #13394A) e logotipos oficiais da marca.
  - Componentização visual consistente com suporte a acessibilidade (StatusBadge combinando cor, texto e ícones para os estados `DISPONIVEL`, `PROGRAMADO`, `EM_ROTA`, `INDISPONIVEL`).
- **Design System Operacional & Componentes de Feedback**:
  - Implementação dos componentes `SearchInput`, `FilterBar`, `Pagination`, `Drawer` (gaveta lateral), `ConfirmDialog`, `Skeleton` e `StatusBadge`.
- **Navegação Hierárquica Operacional**:
  - Atualização dos componentes `Sidebar` e `Header` com suporte a seções colapsáveis por domínio, busca unificada de frota e indicação de fuso oficial `America/Bahia`.
- **Módulos de Domínio e Gestão**:
  - **Empresas (`/app/empresas`)**: Listagem, busca por CNPJ/CPF, formulários em gaveta lateral, visualização de detalhes e histórico de configurações de capacidade contratual.
  - **Motoristas (`/app/motoristas`)**: Cadastro, edição, busca por nome/placa, filtros por categoria (`DEDICADO`/`SPOT`) e especialidade (`SECO`/`REFRIGERADO`).
  - **Veículos (`/app/veiculos`)**: Gestão da frota física com validação e formatação de placas (Mercosul/tradicional) e associação a motoristas dedicados.
  - **Contratos & Vínculos Dedicados (`/app/contratos`)**: Gestão de capacidades vigentes vs histórico de vigências e administração do binômio Motorista + Veículo Físico Dedicado.
  - **Motivos de Indisponibilidade (`/app/configuracoes/motivos-indisponibilidade`)**: Cadastro e gestão de justificativas operacionais com controle de ativamento/desativamento sem exclusão destrutiva.
  - **Usuários (`/app/usuarios`)**: Gestão administrativa dos operadores do sistema e edição de perfis/status.
  - **Agendamentos (`/app/agendamentos` e `/app/agendamentos/:id`)**:
    - Janela de agendamento (orientação visual Hoje vs Amanhã, horário padrão 08:00).
    - Preenchimento contratual automático por vaga mantendo ocupadas as vagas com recursos dedicados indisponíveis.
    - Gestão de SPOT: adição, remoção e substituição com lock pessimista (`POST /api/v1/agendamentos/alocacoes/{id}/substituir`).
    - Trilha de histórico auditável do agendamento formatada em `America/Bahia`.
- **Testes & Qualidade**:
  - Suíte de 24 testes de integração do frontend em Vitest cobrindo fluxos críticos dos módulos operacionais.
  - Compilação estrita `tsc && vite build` aprovada com zero erros.
  - Manutenção da suíte de 32 testes do backend Python (pytest) 100% verde.

## [0.3.0] - 2026-08-20

### Adicionado & Consolidado (Fase 3)

- **Autenticação (`/auth/me`)**:
  - Adicionada rota `GET /api/v1/auth/me` para retornar o perfil do usuário autenticado a partir do token JWT.
- **Gestão de Usuários**:
  - Adicionadas rotas `GET /api/v1/usuarios/{id}` e `PUT /api/v1/usuarios/{id}` para consulta e edição de perfil/status de usuários com trilha de auditoria.
- **Histórico Contratual**:
  - Adicionada rota `GET /api/v1/contratos/empresas/{empresa_id}/configuracoes` para listar todo o histórico de configurações contratuais da empresa em ordem cronológica decrescente.
- **Substituição de SPOT com Lock Pessimista**:
  - Adicionado endpoint `POST /api/v1/agendamentos/alocacoes/{alocacao_id}/substituir` e método `AgendamentoService.substituir_spot`.
  - Operação atômica que aplica `with_for_update()` nos registros do novo motorista e veículo, verifica disponibilidade, remove o SPOT antigo e insere o novo SPOT com registro de histórico (`SUBSTITUICAO_SPOT`).
- **Histórico de Agendamento**:
  - Adicionado endpoint `GET /api/v1/agendamentos/{agendamento_id}/historico` para consultar todos os logs auditáveis do ciclo de vida do agendamento.
- **Paginação e Filtros para Frontend**:
  - Adicionados parâmetros de paginação `limite` e `offset` e suporte a formato paginado `{items, total, limite, offset}` em `GET /api/v1/agendamentos`.
  - Adicionados filtros por `placa`, `motorista_nome`, `motorista_id` e paginação `limite`/`offset` em `GET /api/v1/operacao/torre/detalhamento`.
  - Adicionados parâmetros `limite` e `offset` em `GET /api/v1/operacao/historico-eventos`.
- **Suíte de Testes de Consolidação (Fase 3)**:
  - Criado `tests/test_fase_3_consolidacao.py` adicionando 11 novos testes (incluindo teste concorrente em multithread para substituição de SPOT). Total da suíte: 32 testes 100% aprovados.

## [0.2.1] - 2026-08-20

### Corrigido & Hardening (Fase 2.9)

- **Exclusividade de Veículo Dedicado (BUG-CRIT-01)**:
  - Adicionado índice único parcial no banco de dados (`idx_unique_veiculo_dedicado_ativo`) em `motoristas_dedicados_vinculos` garantindo que um veículo só possa estar vinculado a uma empresa dedicada ativa por vez.
  - Implementada validação defensiva na camada de serviço e tratamento gracioso de `IntegrityError` na API devolvendo `HTTP 400 Bad Request`.
  - Migration Alembic `fdb34b2e5214` totalmente reversível.
- **Prevenção de Race Condition na Alocação Operacional (BUG-CRIT-02)**:
  - Aplicados bloqueios pessimistas em nível de linha (`with_for_update()`) nos registros de `Motorista` e `Veiculo` no método `verificar_conflito_alocacao`.
  - Serialização estrita de requisições concorrentes em multithread sem travamentos de deadlock.
  - Permissão mantida para reutilização sequencial do motorista/veículo no mesmo dia após status `DISPONIVEL`.
- **Indicadores de Capacidade Contratual na Torre de Controle (BUG-ALTO-01)**:
  - Corrigida a fórmula de cálculo da Torre: `CONTRATADOS = PROGRAMADOS + EM_ROTA + DISPONÍVEIS + INDISPONÍVEIS + VAGAS_NAO_PREENCHIDAS`.
  - Atualizados os schemas `ResumoTorreResponse` e `ResumoEmpresaTorreResponse` para expor `contratados` e `vagas_nao_preenchidas`.
- **Snapshot Histórico de Contrato no Agendamento (BUG-ALTO-02)**:
  - Adicionada a coluna FK `contrato_configuracao_id` na tabela `agendamentos` via migration Alembic `6c0ffd5f53b1`.
  - Captura automática da configuração contratual vigente no momento exato da criação do agendamento, preservando a referência histórica independente de reconfigurações futuras.
- **Filtros de Data Respeitando Fuso America/Bahia (BUG-ALTO-03)**:
  - Criados utilitários `inicio_do_dia_utc` e `fim_do_dia_utc` em `app/core/datetime_utils.py` convertendo com precisão de microsegundos (`00:00:00` a `23:59:59.999999`) do fuso `America/Bahia` para UTC.
  - Atualizados os filtros por período no serviço de operação de eventos e detalhamento da Torre.
- **Suíte de Testes de Hardening**:
  - Criado o arquivo `tests/test_fase_2_9_hardening.py` cobrindo 100% dos 5 problemas identificados na auditoria técnica.

## [0.2.0] - 2026-08-20

### Adicionado

- **Motor Operacional & Agendamentos**:
  - Modelos de dados para `Agendamento`, `AlocacaoOperacional` (Motorista + Veículo), `HistoricoAgendamento`.
  - Controle de janela de criação de agendamento: regra de dia atual (respeitando horário limite configurável `horario_limite_agendamento_dia_atual`, padrão `12:00`) e dia seguinte.
  - Máquina de estados de agendamentos (`RASCUNHO`, `PROGRAMADO`, `EM_EXECUCAO`, `CONCLUIDO`, `CANCELADO`).
- **Alocação Operacional & Exclusividade**:
  - Associação explícita entre empresa, motorista e veículo físico (`veiculo_id`).
  - Preenchimento automático de motoristas e veículos **DEDICADOS** nas novas programações da empresa.
  - Suporte completo a inclusão, remoção e substituição de motoristas/veículos **SPOT**.
  - Validação rigorosa de conflito operacional impedindo dupla alocação simultânea de motoristas e veículos.
- **Máquina de Estados Operacional & Motivos**:
  - Estados operacionais: `DISPONIVEL`, `PROGRAMADO`, `EM_ROTA`, `INDISPONIVEL`.
  - Regra de obrigatoriedade de motivo cadastrável ao transitar para `INDISPONIVEL`.
  - Manutenção da vaga contratual ocupada mesmo quando um veículo/motorista dedicado estiver indisponível.
  - Reutilização no mesmo dia de motoristas/veículos liberados (`EM_ROTA` -> `DISPONIVEL`).
- **Histórico & Eventos Operacionais**:
  - Registro imutável de `EventoOperacional` a cada alteração de status com fuso `America/Bahia`.
  - Preservação do nome histórico do motivo de indisponibilidade.
  - Histórico auditável de alterações na composição do agendamento.
- **Painel da Torre de Controle (Read Model)**:
  - Endpoints de resumo geral (`/operacao/torre/resumo`) e por empresa (`/operacao/torre/empresas-resumo`).
  - Visão detalhada da frota e motoristas (`/operacao/torre/detalhamento`) com suporte a filtros operacionais.
  - Endpoint de consulta ao histórico de eventos operacionais imutáveis (`/operacao/historico-eventos`).

## [0.1.0] - 2026-08-19

### Adicionado

- **Fundação de Arquitetura**: Documentos técnicos descrevendo a estrutura Modular Monolith, modelagem de banco de dados, regras de negócio e especificações de API na pasta `docs/`.
- **Containers Docker**: Configuração de `Dockerfile` multiestágio de runtime otimizado e `docker-compose.yml` contendo o banco PostgreSQL 15 integrado com healthcheck.
- **Ambiente Python**: Criação do arquivo `requirements.txt` e configuração do ambiente virtual `.venv` gerenciado via `uv`.
- **Módulo Core**:
  - Configurações do sistema via Pydantic Settings (`app/core/config.py`).
  - Conexão de banco e classe abstrata de chaves primárias e timestamps automáticos (`app/core/database.py`).
  - Segurança, criptografia de senhas com bcrypt e geração de JWT (`app/core/security.py`).
  - Utilitários de timezone para gestão estrita e unificada do fuso `America/Bahia` (`app/core/datetime_utils.py`).
- **Módulos de Negócio (Modelos, Schemas, Serviços e Rotas)**:
  - **Usuários**: Cadastro administrativo com hash de senha e bootstrap automático caso o banco de dados esteja vazio.
  - **Autenticação**: Geração de tokens JWT e rota de login `/api/v1/auth/login`.
  - **Empresas**: Cadastro de parceiros operacionais e atualizações cadastrais.
  - **Motoristas**: Gestão de motoristas habilitados na operação.
  - **Veículos**: Cadastro de frota com CheckConstraint no banco para especialidades `SECO` e `REFRIGERADO`.
  - **Contratos e Vigências**: Lógica de vigência temporal sem sobreposições e com encerramento automático do período anterior.
  - **Vínculos de Motoristas Dedicados**: Regra de exclusividade de alocação de motoristas ativos em contratos de empresas, com desativação histórica de vínculos.
  - **Auditoria**: Trilha de auditoria explícita na camada de serviço capturando estados anteriores e posteriores em formato `JSONB`.
- **Testes Automatizados**: Suíte de testes integrados em `tests/` cobrindo autenticação, vigências, relacionamentos, exclusividades e auditoria usando banco de dados PostgreSQL transacional (com rollback automático).

## [4.1.1] — 2026-09-17 — S1 Melhoria geral de layout/interface
- Alinhamento à Identidade Visual Logtudo: Button primário, Spinner, foco de Input/Select/SearchInput e avatar do Header migrados de `sky-*` para a paleta institucional (`logtudo-primary/hover/accent/border/surface`).
- Novo componente `TableSkeleton` (components/ui) substituindo os skeletons ad-hoc duplicados em Motoristas, Veículos, Empresas e Agendamentos.
- Densidade de tabelas padronizada: `TableHeadCell`/`TableCell` `px-4 py-3` → `px-3 py-2.5`, cabeçalho com `whitespace-nowrap`.
- Responsividade: padding principal do layout `p-6` → `p-4 md:p-6` (validado sem overflow horizontal em 768px e 390px).
- Scrollbar global alinhada à paleta institucional.
- Verificado: tsc limpo, 29/29 testes Vitest, build de produção OK, 9 módulos auditados no browser antes/depois.
