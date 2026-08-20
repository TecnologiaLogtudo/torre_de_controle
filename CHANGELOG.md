# Changelog

Todas as alterações relevantes para este projeto serão documentadas neste arquivo.

O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/spec/v2.0.0.html).

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
