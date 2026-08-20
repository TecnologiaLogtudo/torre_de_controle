# Decisões Arquiteturais (ADRs) — Torre de Controle Logtudo

Este documento reúne os Registros de Decisão de Arquitetura (ADRs) adotados para o projeto, justificando as escolhas técnicas e apresentando alternativas analisadas e seus trade-offs.

---

## ADR 001: Padrão Monolito Modular (Modular Monolith)

### Status
Aprovado

### Contexto
O sistema Torre de Controle está iniciando como um MVP, mas possui perspectiva de expansão de escopo com inclusão de agendamentos, roteirização, monitoramento operacional de rotas e novos relatórios. Arquiteturas de microserviços trazem alta complexidade operacional no início (redes, consistência eventual, deploys distribuídos), enquanto monolitos tradicionais mal estruturados tendem a se tornar "espaguetes" difíceis de desacoplar.

### Decisão
Adotamos o padrão de **Monolito Modular** (Modular Monolith). O código é estruturado de forma que cada domínio do negócio possua sua própria pasta (módulo) auto-contida contendo seus modelos de dados, repositórios, serviços e rotas. A comunicação entre módulos deve passar por contratos de serviços limpos.

### Alternativas Consideradas
1.  **Monolito Tradicional (Sem divisões de módulos)**: Simples no início, mas com alto risco de acoplamento total entre tabelas e regras de negócio de diferentes domínios.
2.  **Microsserviços**: Forneceria escala independente de início, mas aumentaria drasticamente a complexidade de deploy, rede e consistência de dados, sendo desnecessário para a atual escala do MVP.

### Consequências
*   *Positivo*: Manutenibilidade elevada, facilidade para extrair módulos no futuro para microsserviços se necessário.
*   *Positivo*: Deploy simples de uma única aplicação FastAPI e banco PostgreSQL (via Docker Compose).
*   *Negativo*: Exige disciplina dos desenvolvedores para não cruzar referências diretas de banco de dados entre os módulos sem passar pelas camadas de serviço apropriadas.

---

## ADR 002: Armazenamento de Configurações de Contratos usando JSONB

### Status
Aprovado

### Contexto
As empresas configuram regras de quantidade mínima/máxima de veículos dedicados por tipo de veículo (ex: 4 HRs, 4 Fiorinos, 2 Trucks). O sistema exige que essas regras tenham vigência histórica imutável e que novas regras contratuais futuras possam ser adicionadas sem quebrar o histórico ou exigir frequentes migrações de banco de dados.

### Decisão
Optamos por persistir as regras contratuais de capacidade em uma coluna do tipo **JSONB** do PostgreSQL, dentro da tabela `contratos_configuracoes`. A estrutura típica do JSONB será: `{"HR": 4, "Fiorino": 4, "Truck": 2}`.

### Alternativas Consideradas
1.  **Estrutura Relacional Tradicional (Tabela de Itens)**: Uma tabela `contratos_configuracoes_itens` vinculando tipo de veículo e quantidade.
    *   *Prós*: Facilidade para aplicar restrições relacionais (chaves estrangeiras no tipo de veículo).
    *   *Contras*: Menos flexível se o contrato passar a exigir regras diferentes de contagem de veículos, como restrições de horários de rodízio ou especialidade (seco/refrigerado) por tipo.
2.  **Esquema EAV (Entity-Attribute-Value)**: Altamente flexível, mas complexo de consultar e performar.

### Consequências
*   *Positivo*: Alta flexibilidade. Se novos atributos contratuais forem definidos na Etapa 2, podemos adicioná-los ao documento JSON sem criar migrações de schema de banco.
*   *Positivo*: Facilidade de indexação nativa do PostgreSQL via índices GIN sobre campos JSONB.
*   *Negativo*: Perda de validação nativa de chave estrangeira a nível de banco para os tipos de veículos nas regras, exigindo que a validação de integridade seja feita estritamente no código da aplicação (via schemas Pydantic e Services).

---

## ADR 003: Estratégia de Identificadores baseada em UUID v4

### Status
Aprovado

### Contexto
Utilizar IDs inteiros incrementais simples (`SERIAL`) expõe a volumetria de dados do sistema publicamente (ID harvesting/enumeração de recursos) e dificulta a mesclagem ou importação distribuída de dados no futuro.

### Decisão
Usaremos **UUID v4** como chaves primárias de todas as tabelas. A geração será delegada preferencialmente ao PostgreSQL através da extensão `pgcrypto` (`gen_random_uuid()`) para garantir inserções eficientes no banco, mas a aplicação FastAPI também estará apta a gerar UUIDs no nível de aplicação quando necessário.

### Alternativas Consideradas
1.  **IDs Sequenciais (Bigint Auto-increment)**: Melhor performance de inserção no banco de dados clássico, mas inseguro para uso direto em URIs da API.
2.  **Hashids / IDs mascarados na API**: IDs sequenciais por baixo, mas mascarados para o cliente. Adiciona overhead de codificação/decodificação na camada de rotas.

### Consequências
*   *Positivo*: IDs impossíveis de adivinhar, seguros para exposição em endpoints públicos.
*   *Positivo*: Geração segura e unificada tanto no banco quanto na aplicação.
*   *Negativo*: Ocupação ligeiramente maior de espaço em disco (128 bits contra 64 bits de bigint) e índices ligeiramente menos performáticos no banco devido à fragmentação de chaves primárias não sequenciais. Esse impacto é desprezível no volume esperado para o MVP.

---

## ADR 004: Gestão de Timezones e Data/Hora na Aplicação e no PostgreSQL

### Status
Aprovado

### Contexto
A operação da Logtudo é centrada no timezone de Salvador/Bahia (`America/Bahia`). O armazenamento inconsistente de datas (misturando naive datetimes e timezone-aware datetimes) gera bugs recorrentes de cálculo e consultas com offsets incorretos.

### Decisão
1.  O PostgreSQL armazenará todas as colunas de data/hora como `TIMESTAMP WITH TIME ZONE` (`TIMESTAMPTZ`), garantindo a preservação absoluta do instante temporal em UTC no banco de dados.
2.  A aplicação FastAPI utilizará exclusivamente a biblioteca `zoneinfo` do Python 3.9+ configurada para o fuso `America/Bahia`.
3.  Nas requisições de entrada, strings de data sem timezone explícito serão interpretadas como pertencentes a `America/Bahia` e convertidas para UTC na inserção do banco.
4.  Nas respostas de saída da API, um serializador global do Pydantic garantirá que todos os campos de datetime sejam apresentados ao cliente no fuso `America/Bahia` (offset `-03:00` ou similar).

### Alternativas Consideradas
1.  **Armazenar como TIMESTAMP ingênuo (sem timezone)**: Assume que o servidor de banco está configurado com o timezone correto. Vulnerável a erros se o servidor for migrado para a nuvem em outra região geográfica (ex: US-East).
2.  **Retornar tudo em UTC na API**: Obriga o consumidor da API (frontend ou integrações) a gerenciar fusos horários locais, o que pode introduzir bugs visuais.

### Consequências
*   *Positivo*: Consistência total. As consultas históricas e de vigências contratuais não sofrerão com problemas de arredondamento de dia por causa do fuso horário.
*   *Negativo*: Exige configuração rigorosa dos parsers e serializadores Pydantic para garantir que nenhum datetime "ingênuo" (sem timezone) circule no sistema.

---

## ADR 005: Auditoria Explícita na Camada de Serviço

### Status
Aprovado

### Contexto
O sistema precisa registrar modificações críticas nas tabelas de dados. Existem duas estratégias clássicas: usar triggers/listeners automáticos no SQLAlchemy ou registrar de forma imperativa e explícita na camada de serviço.

### Decisão
A auditoria de modificações críticas será executada de forma **explícita na camada de serviço** (`services.py`). Cada método de modificação (ex: atualizar motorista, inativar empresa) será responsável por instanciar a chamada ao serviço de auditoria, registrando o estado anterior e posterior.

### Alternativas Consideradas
1.  **Listeners Globais de Eventos do SQLAlchemy (`after_flush` / `before_flush`)**:
    *   *Prós*: Automatiza 100% da auditoria, reduzindo o risco de o desenvolvedor esquecer de chamar o log de auditoria no código de serviço.
    *   *Contras*: Introduz comportamento "mágico" implicitamente nas transações do banco de dados. Dificulta testes unitários, isolamento de escopo e identificação clara de qual usuário (JWT) realizou a ação (pois o SQLAlchemy listener opera em nível global da sessão de banco, onde o contexto da request HTTP/JWT nem sempre está facilmente acessível ou limpo de injetar).

### Consequências
*   *Positivo*: Sem mágicas ocultas. Fluxo de código fácil de ler, debugar e testar com mocks. Facilidade total para injetar o `usuario_id` obtido no middleware de autenticação JWT diretamente no método do serviço.
*   *Negativo*: O desenvolvedor deve lembrar-se de adicionar a chamada do serviço de auditoria em novos métodos de escrita críticos. Mitigaremos isso incluindo verificações de auditoria nos testes automatizados de integração das APIs.
