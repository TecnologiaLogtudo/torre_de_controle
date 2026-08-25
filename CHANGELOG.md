# Changelog

Todas as alterações relevantes para este projeto serão documentadas neste arquivo.

O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Alterado / Adicionado

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
