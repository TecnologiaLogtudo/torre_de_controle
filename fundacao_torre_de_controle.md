\# Prompt 1 — Fundação da Torre de Controle Logtudo



Você é o responsável técnico pela implementação do backend da \*\*Torre de Controle da Logtudo\*\*.



O objetivo desta etapa é construir a fundação do sistema, \*\*sem desenvolver frontend\*\*.



\## Contexto



A Torre de Controle será inicialmente um MVP, mas deverá possuir arquitetura modular e baixo acoplamento para permitir futuras expansões sem necessidade de reescrever módulos existentes.



A aplicação deverá utilizar:



\* Python

\* FastAPI

\* PostgreSQL

\* SQLAlchemy

\* Alembic

\* Pydantic

\* autenticação baseada em JWT

\* Docker

\* timezone `America/Bahia`



Utilize código, comentários, nomes de variáveis, classes, funções e documentação em \*\*pt-BR\*\*, mantendo os termos técnicos de bibliotecas e frameworks em seus nomes originais.



Não implemente microservices. Utilize uma arquitetura \*\*modular monolith\*\*, com separação clara de responsabilidades.



\## Objetivo da etapa



Construir toda a fundação do backend e do banco de dados.



Crie uma estrutura semelhante a:



```text

app/

├── core/

├── auth/

├── usuarios/

├── empresas/

├── contratos/

├── motoristas/

├── veiculos/

├── agendamentos/

├── operacao/

├── auditoria/

└── configuracoes/

```



A estrutura poderá ser ajustada caso exista uma organização tecnicamente melhor, mas deve preservar o princípio de módulos independentes e baixo acoplamento.



\## Entidades iniciais



Modele adequadamente:



\### Usuário



Deve permitir:



\* nome

\* login/e-mail

\* senha armazenada com hash seguro

\* ativo/inativo

\* timestamps



\### Empresa



Deve possuir:



\* nome

\* identificação

\* ativo/inativo

\* timestamps



\### Motorista



Deve possuir:



\* nome

\* ativo/inativo

\* timestamps



Não acople permanentemente o motorista a um único veículo.



\### Veículo



Deve possuir:



\* identificação

\* placa

\* tipo de veículo

\* especialidade: SECO ou REFRIGERADO

\* ativo/inativo

\* timestamps



\### Categoria operacional



Um vínculo operacional deverá distinguir:



\* DEDICADO

\* SPOT



Não transforme isso em texto livre.



Utilize enums ou outra solução segura.



\### Status operacional



Preparar o domínio para:



\* DISPONIVEL

\* PROGRAMADO

\* EM\_ROTA

\* INDISPONIVEL



\## Contratos/configurações de empresas



Uma empresa poderá possuir regras de veículos dedicados.



Exemplo:



```text

LATAM

HR: 4

Fiorino: 4

Truck: 2

```



Essa configuração deve possuir \*\*vigência\*\*.



Nunca sobrescreva historicamente uma configuração antiga.



Exemplo:



```text

Configuração A

01/01/2026 → 31/08/2026



Configuração B

01/09/2026 → indefinido

```



Consultas históricas deverão continuar retornando a configuração vigente naquela data.



Modele isso de forma que futuras regras contratuais possam ser adicionadas sem destruir o histórico.



\## Vínculo de motoristas dedicados



O sistema deverá permitir vincular motoristas dedicados a uma empresa e a uma categoria/tipo de veículo.



Esse vínculo é persistente.



Exemplo:



```text

LATAM

HR 1 → João

HR 2 → Pedro

HR 3 → Carlos

HR 4 → Marcos

```



Se Carlos ficar indisponível, ele não deve desaparecer da estrutura contratual.



A indisponibilidade será tratada posteriormente pela camada operacional.



\## Regras arquiteturais



Não coloque regra de negócio dentro dos routers do FastAPI.



Utilize separação entre:



\* routers/controllers

\* schemas

\* services

\* repositories, quando necessário

\* models

\* regras de domínio

\* infraestrutura



Evite abstrações desnecessárias.



O objetivo é ter uma arquitetura organizada, mas pragmática.



\## Banco de dados



Configure:



\* PostgreSQL

\* SQLAlchemy

\* Alembic

\* migrations

\* constraints

\* índices necessários

\* chaves estrangeiras

\* timestamps

\* integridade referencial



Utilize UUID ou outra estratégia consistente para identificadores.



Defina claramente a estratégia escolhida e documente-a.



\## Auditoria



Prepare a infraestrutura para auditoria.



Toda operação crítica deverá futuramente permitir identificar:



\* usuário responsável

\* data/hora

\* entidade afetada

\* ação

\* estado anterior

\* estado posterior



Não implemente uma solução superficial apenas com `updated\_at`.



\## Timezone



Todo tratamento de data/hora deverá considerar:



```text

America/Bahia

```



Evite misturar timestamps ingênuos com timestamps timezone-aware.



Documente a estratégia adotada.



\## API



Crie endpoints básicos para:



\* autenticação

\* usuários

\* empresas

\* motoristas

\* veículos

\* configurações/contratos

\* vínculos de motoristas dedicados



Utilize Pydantic para entrada e saída.



Documente corretamente a API através do OpenAPI gerado pelo FastAPI.



\## Testes



Crie testes automatizados para:



\* criação das entidades;

\* validações;

\* relacionamentos;

\* regras de vigência;

\* vínculo de motorista dedicado;

\* autenticação;

\* permissões básicas.



Não avance para frontend.



\## Docker



Prepare:



\* aplicação FastAPI

\* PostgreSQL



Utilize `.env.example`.



Nunca coloque credenciais reais no código.



\## Documentação



Crie documentação técnica versionada no repositório, incluindo pelo menos:



```text

docs/

├── arquitetura.md

├── banco\_de\_dados.md

├── regras\_de\_negocio.md

├── api.md

└── decisoes\_arquiteturais.md

```



Também crie ADRs quando houver decisões arquiteturais relevantes.



\## Critério de conclusão



A etapa só será considerada concluída quando:



1\. O projeto executar localmente.

2\. O PostgreSQL estiver funcionando.

3\. As migrations funcionarem do zero.

4\. A API iniciar corretamente.

5\. A autenticação funcionar.

6\. As entidades principais estiverem implementadas.

7\. Os testes automatizados estiverem funcionando.

8\. A documentação estiver criada.

9\. Não existirem credenciais hardcoded.

10\. O código estiver organizado para receber a Etapa 2 sem refatoração estrutural.



Antes de implementar, analise o requisito inteiro e identifique inconsistências arquiteturais.



Não invente funcionalidades fora do escopo.



Quando uma decisão for necessária, escolha a alternativa mais simples, robusta e escalável e registre a decisão em documentação/ADR.



