# Prompt 2 — Motor Operacional, Agendamentos, Auditoria e Preparação do Backend

Continue a implementação da **Torre de Controle da Logtudo** a partir da fundação criada na Etapa 1.

**Não recrie a arquitetura existente.**

Antes de alterar qualquer código, analise a estrutura atual e preserve as decisões arquiteturais já implementadas.

**Não desenvolva frontend nesta etapa.**

O objetivo desta etapa é implementar toda a inteligência operacional da Torre de Controle e deixar o backend completamente preparado para ser consumido pelo frontend posteriormente.

---

# 1. Princípios fundamentais

A aplicação deverá continuar utilizando uma arquitetura **modular monolith**, com baixo acoplamento entre módulos.

Não coloque regras de negócio dentro dos routers/controllers.

As regras deverão ficar em serviços/domínio apropriados.

Não crie dependências entre módulos que tornem futuras alterações perigosas.

O frontend da Etapa 4 deverá consumir exclusivamente a API.

Não permita que o frontend precise conhecer ou reproduzir regras de negócio.

---

##1.2. regra arquitetural obrigatória - veículo físico

Regra arquitetural obrigatória — veículo físico

Na Etapa 1, o vínculo dedicado ainda não possui necessariamente a associação operacional completa entre motorista e veículo físico/placa.

Na Etapa 2, essa lacuna deverá ser resolvida.

O sistema deve ser capaz de identificar inequivocamente, em uma operação:

empresa;
motorista;
veículo físico;
placa;
tipo de veículo;
categoria DEDICADO/SPOT;
status operacional.

Não utilize placa como simples texto solto dentro do agendamento.

O veículo físico deve ser uma entidade própria e o relacionamento operacional deve preservar a integridade entre motorista e veículo.

Para um dedicado, a estrutura deverá permitir representar:

Empresa → Vínculo dedicado → Motorista + Veículo físico

Para um SPOT, deverá ser possível representar:

Agendamento → Alocação SPOT → Motorista + Veículo físico

O mesmo veículo físico não poderá estar simultaneamente alocado em operações conflitantes.

O mesmo motorista também não poderá estar simultaneamente alocado em operações conflitantes.

O status operacional deverá ser aplicado ao contexto operacional motorista + veículo, e não ao cadastro estático do motorista.

Não implemente uma entidade de "check-in/check-out" ou "viagem" apenas por antecipação. Nesta etapa, utilize o ciclo operacional definido no requisito: PROGRAMADO → EM_ROTA → DISPONIVEL, com o encerramento/liberação do atendimento permitindo uma nova alocação no mesmo dia.

---

# 2. Solicitações e agendamentos

Implementar o módulo de solicitações/agendamentos.

Uma solicitação/agendamento deverá possuir, no mínimo:

* empresa;
* data;
* horário de início;
* status do agendamento;
* usuário responsável pela criação;
* timestamps;
* histórico de alterações.

O horário padrão deverá ser:

```text
08:00
```

mas deverá ser configurável.

## Janela de criação de agendamentos

No MVP, será permitido criar agendamentos para:

1. **dia atual**;
2. **dia seguinte**.

Para o dia atual, deverá existir um horário limite configurável.

O padrão inicial será:

```text
12:00
```

Exemplo:

```text
19/08/2026
até 12:00 → permitido criar agendamento para 19/08/2026

após 12:00 → não permitir novos agendamentos para 19/08/2026
```

Entretanto, a regra deve ser configurável.

Não hardcode `12:00` diretamente nas regras de negócio.

Deve existir uma configuração semelhante a:

```text
horario_limite_agendamento_dia_atual
```

com valor padrão `12:00`.

## Agendamento para o dia seguinte

Durante o dia atual, será possível criar e atualizar agendamentos referentes ao dia seguinte.

Exemplo:

```text
Hoje: 19/08

Agendamento:
20/08 — 08:00

Durante todo o dia 19/08:
→ pode ser criado
→ pode ser alterado
→ pode receber novos spots
→ pode sofrer alterações na composição operacional
```

O sistema deverá preservar o histórico dessas alterações.

Não sobrescrever silenciosamente o estado anterior.

---

# 3. Ciclo de vida do agendamento

O agendamento deverá possuir estados controlados.

Defina uma máquina de estados coerente, por exemplo:

```text
RASCUNHO
PROGRAMADO
EM_EXECUCAO
CONCLUIDO
CANCELADO
```

A nomenclatura pode ser ajustada caso exista uma alternativa tecnicamente melhor.

Defina explicitamente:

* quais transições são permitidas;
* quem pode executar cada transição;
* quais transições exigem auditoria;
* quais alterações são permitidas antes e depois do início da operação.

Não permita alterações arbitrárias.

## Importante

O status do **agendamento** é diferente do status **operacional do motorista/veículo**.

Não misture os dois conceitos.

Exemplo:

```text
Agendamento:
PROGRAMADO

Motorista:
EM_ROTA
```

São estados diferentes e devem existir separadamente.

---

# 4. Alterações em agendamentos

Um agendamento do dia seguinte poderá ser alterado ao longo do dia.

As alterações podem incluir, conforme as regras de negócio:

* quantidade de veículos;
* motorista;
* veículo;
* inclusão de SPOT;
* remoção de SPOT;
* substituição de motorista;
* substituição de veículo;
* horário;
* outras informações permitidas.

Toda alteração relevante deverá gerar histórico.

Exemplo:

```text
Agendamento #123

19/08 08:30
Criado por Felipe

19/08 10:15
+1 Fiorino SPOT
Alterado por Maria

19/08 14:20
SPOT XYZ-1234 substituído por ABC-5678
Alterado por João
```

O sistema deverá permitir reconstruir o histórico do agendamento.

---

# 5. Dedicados

Para empresas que possuem veículos dedicados, o sistema deverá consultar a configuração contratual vigente na data do agendamento.

Exemplo:

```text
LATAM

HR       4
Fiorino  4
Truck    2
```

A quantidade contratada não deverá ser armazenada como um valor fixo dentro do agendamento sem referência à configuração vigente.

O agendamento deve preservar qual configuração estava vigente no momento de sua criação/programação, quando necessário para auditoria e histórico.

---

# 6. Vínculo dedicado

O vínculo dedicado representa uma relação persistente entre:

```text
Empresa
+
Veículo
+
Motorista
+
Tipo de veículo
```

Um veículo dedicado **não pode pertencer simultaneamente a duas empresas**.

Da mesma forma, o vínculo deve impedir conflitos de alocação incompatíveis.

Os motoristas dedicados previamente vinculados à empresa devem aparecer automaticamente nas próximas programações.

## Exemplo

```text
LATAM

HR 01 → João
HR 02 → Pedro
HR 03 → Carlos
HR 04 → Marcos
```

Na próxima programação:

```text
HR

João
Pedro
Carlos
Marcos
```

O sistema não deverá exigir que o operador cadastre novamente esses motoristas.

---

# 7. Dedicado indisponível

Quando um motorista/veículo dedicado estiver indisponível:

* ele continua vinculado à empresa;
* continua ocupando a vaga contratual;
* continua aparecendo na programação;
* deve ser contabilizado nos indicadores;
* deve aparecer como indisponível;
* deve possuir motivo da indisponibilidade;
* não deve desaparecer da estrutura;
* não deve ser automaticamente substituído.

Exemplo:

```text
LATAM — HR

Vaga 01 → João     → DISPONÍVEL
Vaga 02 → Pedro    → EM ROTA
Vaga 03 → Carlos   → INDISPONÍVEL — AVARIA
Vaga 04 → Marcos   → PROGRAMADO
```

Indicador:

```text
Contratados:       4
Disponíveis:       1
Programados:       1
Em rota:           1
Indisponíveis:     1
```

A soma deverá representar as quatro vagas contratadas.

Não transformar indisponibilidade em remoção da vaga.

---

# 8. Status operacional

Implementar os seguintes estados operacionais:

```text
DISPONIVEL
PROGRAMADO
EM_ROTA
INDISPONIVEL
```

O status operacional pertence ao contexto:

```text
Motorista + Veículo
```

e não ao cadastro estático do motorista.

O cadastro deve armazenar informações permanentes.

O estado operacional deve ser tratado pela camada de operação.

---

# 9. Motivos de indisponibilidade

Esta é uma regra importante.

`INDISPONIVEL` não deve ser apenas um status sem contexto.

Quando um motorista/veículo passar para:

```text
INDISPONIVEL
```

deverá obrigatoriamente existir um motivo.

Os motivos deverão ser cadastráveis/configuráveis.

Não hardcode uma lista fechada no código.

Exemplos iniciais:

```text
Avaria
Manutenção
Ausência do motorista
Problema documental
Acidente
Problema mecânico
Problema operacional
Outro
```

Esses são apenas exemplos iniciais.

O administrador deverá poder cadastrar, ativar/desativar e eventualmente renomear motivos conforme a estrutura definida na Etapa 1.

## Histórico

O evento operacional deverá armazenar referência ao motivo utilizado naquele momento.

Não depender exclusivamente do cadastro atual do motivo.

Se futuramente:

```text
Problema mecânico
```

for renomeado para:

```text
Falha mecânica
```

os eventos históricos não podem perder a informação original.

Utilize uma estratégia adequada para preservar o histórico.

## Regra

O motivo é obrigatório quando:

```text
novo_status = INDISPONIVEL
```

Para outros status, o motivo de indisponibilidade não é obrigatório.

---

# 10. Transições de status

Criar uma máquina de estados operacional.

Defina e implemente transições coerentes.

Como referência:

```text
DISPONIVEL → PROGRAMADO
PROGRAMADO → EM_ROTA
EM_ROTA → DISPONIVEL
DISPONIVEL → INDISPONIVEL
PROGRAMADO → INDISPONIVEL
EM_ROTA → INDISPONIVEL
INDISPONIVEL → DISPONIVEL
```

Avalie outras transições necessárias.

Não permita alterações arbitrárias de status.

Toda alteração deverá gerar evento operacional.

---

# 11. Reutilização de motorista/veículo no mesmo dia

Um motorista/veículo poderá participar de mais de um atendimento no mesmo dia.

Entretanto, isso só será permitido após a liberação do atendimento anterior.

A condição para nova utilização será:

```text
Atendimento anterior encerrado
+
motorista/veículo marcado como DISPONIVEL
```

Exemplo:

```text
08:00
LATAM
João → EM_ROTA

10:30
Atendimento encerrado

10:31
João → DISPONIVEL

11:00
João pode ser selecionado para novo atendimento
```

Se o atendimento anterior ainda estiver ativo:

```text
João → EM_ROTA
```

ele não poderá ser selecionado para outro atendimento simultâneo.

O sistema deverá impedir dupla alocação operacional.

## Importante

Não basta verificar se existe outro agendamento no banco.

A disponibilidade deve considerar o **intervalo operacional real** e o estado atual.

---

# 12. SPOT

O SPOT não possui vínculo permanente com a empresa.

Um agendamento poderá possuir:

```text
DEDICADOS
+
SPOT
```

Os conceitos não devem ser misturados.

O SPOT deverá permitir:

* inclusão;
* substituição;
* remoção;
* alteração;
* acompanhamento operacional.

A inclusão de SPOT deverá respeitar a disponibilidade do motorista/veículo.

Um SPOT que esteja:

```text
EM_ROTA
```

ou comprometido com outro atendimento incompatível não poderá ser selecionado.

---

# 13. Validação de conflitos

Implementar validações para impedir:

* motorista em dois atendimentos simultâneos;
* veículo em dois atendimentos simultâneos;
* veículo dedicado vinculado a duas empresas;
* motorista dedicado incompatível com a empresa;
* veículo indisponível sendo programado sem regra explícita;
* alteração de agendamento fora da janela permitida;
* alteração de agendamento já encerrado;
* alteração de configuração histórica.

Essas validações devem existir no backend.

Nunca depender exclusivamente do frontend.

---

# 14. Eventos operacionais

Toda alteração de status deverá gerar um evento histórico.

Exemplo:

```text
19/08/2026 08:12

Empresa:
LATAM

Motorista:
João

Veículo:
HR ABC-1234

Status anterior:
PROGRAMADO

Novo status:
EM_ROTA

Alterado por:
Felipe
```

O evento deverá registrar, quando aplicável:

* empresa;
* motorista;
* veículo;
* agendamento;
* categoria;
* status anterior;
* novo status;
* motivo da indisponibilidade;
* data/hora;
* usuário;
* origem da alteração.

Os eventos devem ser imutáveis.

Não permitir edição retroativa dos eventos operacionais.

---

# 15. Histórico do agendamento

Além dos eventos operacionais, o agendamento deverá possuir seu próprio histórico de alterações.

São conceitos diferentes:

### Histórico do agendamento

Registra alterações na programação.

Exemplo:

```text
Quantidade alterada
Motorista substituído
SPOT adicionado
Horário alterado
```

### Histórico operacional

Registra alterações de estado operacional.

Exemplo:

```text
PROGRAMADO → EM_ROTA
EM_ROTA → DISPONIVEL
DISPONIVEL → INDISPONIVEL
```

Não misture essas duas finalidades.

---

# 16. Criador do agendamento

Todo agendamento deverá possuir explicitamente:

```text
criado_por
```

Esse campo deverá referenciar o usuário que criou o agendamento.

Não dependa apenas da tabela de auditoria para descobrir quem criou.

A auditoria deverá complementar essa informação.

---

# 17. Torre de Controle

Criar endpoints específicos para fornecer os dados necessários ao painel operacional.

## Resumo geral

Retornar:

```text
Total
Disponíveis
Programados
Em rota
Indisponíveis
```

## Por empresa

Retornar:

```text
Empresa
Total
Disponíveis
Programados
Em rota
Indisponíveis
```

## Detalhamento

Retornar:

```text
Empresa
Motorista
Veículo
Placa
Tipo de veículo
Especialidade
Categoria
Status
Motivo de indisponibilidade
Agendamento atual
```

Permitir filtros por:

* data;
* empresa;
* status;
* categoria;
* tipo de veículo;
* especialidade.

---

# 18. Visão operacional por empresa

A API deverá permitir consultar uma empresa isoladamente.

Exemplo:

```text
LATAM

Contratados:
10

Disponíveis:
2

Programados:
3

Em rota:
4

Indisponíveis:
1
```

Também deverá permitir listar os veículos/motoristas daquela empresa.

Isso será utilizado futuramente pelo frontend para criar uma visão operacional semelhante a:

```text
LATAM
──────────────────────────────

HR
João      ABC-1234    EM ROTA
Pedro     DEF-5678    DISPONÍVEL
Carlos    GHI-9012    INDISPONÍVEL
Marcos    JKL-3456    PROGRAMADO

Fiorino
...

Truck
...
```

---

# 19. Histórico da operação

Criar endpoints para consulta dos eventos operacionais.

Permitir filtros por:

* empresa;
* data;
* intervalo de datas;
* motorista;
* veículo;
* categoria;
* status;
* motivo;
* usuário.

Apresentar dados suficientes para identificar:

```text
Data
Hora
Empresa
Motorista
Veículo
Categoria
Status anterior
Novo status
Motivo
Colaborador
Agendamento
```

Preparar também filtros para:

```text
DEDICADO
SPOT
```

---

# 20. Configurações históricas

Garantir que alterações de quantidade contratada não modifiquem agendamentos ou relatórios históricos.

Exemplo:

```text
Janeiro:
HR = 4

Setembro:
HR = 5
```

Um relatório de janeiro deverá continuar mostrando:

```text
HR = 4
```

e nunca utilizar a configuração de setembro.

O mesmo princípio vale para:

* quantidade;
* tipo de veículo;
* vínculos;
* regras contratuais.

---

# 21. Segurança

Implementar:

* autenticação JWT;
* autorização;
* proteção dos endpoints;
* validação dos dados;
* tratamento adequado de erros;
* não exposição de informações sensíveis.

No MVP, **todos os usuários autenticados terão permissão para executar todas as operações**.

Entretanto, não elimine a possibilidade de RBAC futuro.

Estruture a autenticação/autorização de forma que posteriormente seja possível adicionar:

```text
ADMIN
OPERACAO
GESTOR
CONSULTA
```

sem reconstruir os endpoints.

Não implemente RBAC completo agora.

---

# 22. Auditoria

Implementar auditoria das operações críticas:

* criação de agendamento;
* alteração de agendamento;
* cancelamento;
* alteração de status;
* inclusão de SPOT;
* remoção de SPOT;
* substituição de motorista;
* substituição de veículo;
* alteração de configuração contratual;
* alteração de vínculo dedicado;
* alteração de motivo de indisponibilidade.

Registrar:

```text
usuário
data/hora
ação
entidade
identificador
estado anterior
estado novo
```

A auditoria deve utilizar timestamps compatíveis com:

```text
America/Bahia
```

conforme a estratégia definida na Etapa 1.

---

# 23. Preparação para mapa e GPS

Não implementar GPS ou mapa nesta etapa.

Entretanto, a arquitetura deve permitir futuramente adicionar:

```text
GPS
Localização
Latitude
Longitude
Timestamp da posição
Telemetria
Mapa em tempo real
```

sem alterar o núcleo dos:

* motoristas;
* veículos;
* empresas;
* contratos;
* agendamentos.

Não criar tabelas ou serviços complexos de GPS apenas por antecipação.

Apenas mantenha o domínio desacoplado.

---

# 24. Atualização em tempo real

Não implementar WebSocket ou SSE agora.

A API deverá, entretanto, ser preparada para futuramente permitir atualização em tempo real.

No MVP, o frontend poderá utilizar polling.

Não crie dependência entre a regra de negócio e o mecanismo de atualização.

---

# 25. Indicadores

Criar endpoints para indicadores operacionais.

Inicialmente:

```text
Total de veículos
Disponíveis
Programados
Em rota
Indisponíveis
```

Por:

* operação geral;
* empresa;
* categoria;
* tipo de veículo.

Preparar o modelo para futuramente calcular:

* tempo disponível;
* tempo em rota;
* tempo indisponível;
* quantidade de ocorrências;
* taxa de disponibilidade;
* utilização da frota;
* SLA.

Não implemente indicadores avançados ainda.

---

# 26. Testes

Criar testes unitários e de integração para todas as regras críticas.

Obrigatoriamente testar:

### Agendamento

* criação para o dia atual dentro da janela;
* criação para o dia atual após o limite;
* criação para o dia seguinte;
* atualização do dia seguinte;
* tentativa de alterar agendamento encerrado;
* cancelamento.

### Dedicados

* vínculo persistente;
* veículo dedicado em uma única empresa;
* motorista dedicado;
* motorista dedicado indisponível;
* vaga contratual permanecendo ocupada.

### SPOT

* inclusão;
* remoção;
* substituição;
* conflito de disponibilidade.

### Status

* transições válidas;
* transições inválidas;
* indisponibilidade;
* motivo obrigatório;
* retorno de indisponível para disponível.

### Reutilização

Testar:

```text
Atendimento 1
↓
EM_ROTA
↓
Encerramento
↓
DISPONIVEL
↓
Atendimento 2
```

E impedir:

```text
Atendimento 1
↓
EM_ROTA

Atendimento 2
↓
tentativa de utilizar o mesmo motorista/veículo
↓
BLOQUEAR
```

### Histórico

* eventos imutáveis;
* histórico do agendamento;
* auditoria;
* preservação do motivo de indisponibilidade;
* preservação de configurações históricas.

---

# 27. Hardening

Antes de considerar esta etapa concluída:

* revisar módulos;
* eliminar dependências circulares;
* revisar regras de negócio;
* revisar migrations;
* revisar índices;
* revisar constraints;
* revisar transações;
* revisar concorrência;
* revisar validações;
* executar toda a suíte de testes;
* atualizar documentação;
* atualizar ADRs;
* atualizar OpenAPI;
* atualizar README.

Preste atenção especial a condições de corrida.

Por exemplo:

```text
Operador A seleciona João
Operador B seleciona João
```

O backend deve possuir mecanismos para impedir que duas operações simultâneas criem uma alocação inválida.

A consistência deverá ser garantida no backend/banco, não apenas pela interface.

---

# 28. Documentação

Atualizar:

```text
docs/
├── arquitetura.md
├── banco_de_dados.md
├── regras_de_negocio.md
├── api.md
├── decisoes_arquiteturais.md
└── operacao.md
```

Documentar claramente:

* ciclo de vida do agendamento;
* janela de criação;
* janela de alteração;
* regras de dedicado;
* regras de SPOT;
* regras de indisponibilidade;
* motivos;
* transições de status;
* reutilização de motorista/veículo;
* auditoria;
* histórico.

---

# 29. Critério de conclusão

A Etapa 2 só estará concluída quando o backend conseguir executar toda a operação da Torre de Controle **sem frontend**.

Deverá ser possível, através da API:

1. criar uma solicitação;
2. selecionar empresa;
3. identificar a configuração contratual vigente;
4. selecionar dedicados;
5. manter vagas dedicadas mesmo quando indisponíveis;
6. informar motivo da indisponibilidade;
7. adicionar SPOT;
8. criar o agendamento;
9. alterar agendamento do dia seguinte;
10. respeitar a janela configurável do dia atual;
11. alterar status;
12. registrar eventos;
13. encerrar atendimento;
14. liberar motorista/veículo;
15. reutilizá-lo posteriormente no mesmo dia;
16. impedir dupla alocação;
17. consultar a Torre de Controle;
18. consultar histórico;
19. identificar quem criou o agendamento;
20. identificar quem alterou cada evento;
21. preservar histórico contratual;
22. executar auditoria.

O frontend da Etapa 4 deverá apenas consumir essa API.

**Não implemente frontend nesta etapa.**

Não implemente GPS, mapa, IA, roteirização ou integrações externas.

Prepare a arquitetura para recebê-los futuramente sem acoplamento excessivo.

Quando houver uma decisão de implementação não especificada neste prompt, escolha a solução mais simples, consistente e escalável, documente a decisão e não introduza complexidade desnecessária.
