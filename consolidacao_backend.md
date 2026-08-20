Você agora deverá implementar a FASE 3 da Torre de Controle Logtudo.



As Fases 1, 2 e 2.9 já foram implementadas, testadas e aprovadas.



A Fase 3 NÃO é uma reconstrução do backend.



O objetivo desta fase é consolidar o backend operacional, completar os recursos necessários para utilização real da Torre de Controle e preparar uma API estável, consistente e bem estruturada para o frontend que será desenvolvido somente na Fase 4.



============================================================

1\. ESTADO ATUAL DO PROJETO

============================================================



Projeto:



Torre de Controle Logtudo



Arquitetura:



Modular Monolith



Stack:



\- Python

\- FastAPI

\- PostgreSQL

\- SQLAlchemy

\- Alembic

\- Pydantic

\- JWT

\- Docker



Timezone oficial:



America/Bahia



Persistência temporal:



\- Banco: UTC

\- Aplicação: America/Bahia

\- Conversões centralizadas em app/core/datetime\_utils.py



Módulos existentes:



\- auth

\- usuarios

\- empresas

\- motoristas

\- veiculos

\- contratos

\- agendamentos

\- operacao

\- auditoria

\- core



IMPORTANTE:



Antes de implementar qualquer coisa, faça uma inspeção completa do estado atual do projeto.



NÃO presuma que uma funcionalidade está ausente apenas porque ela não foi mencionada neste prompt.



Verifique:



\- models;

\- schemas;

\- services;

\- routers;

\- migrations;

\- testes;

\- documentação;

\- endpoints existentes.



Se uma funcionalidade solicitada neste prompt já existir e estiver correta, NÃO recrie.



Apenas complemente ou corrija se houver deficiência comprovada.



============================================================

2\. RESULTADO ESPERADO DA FASE 3

============================================================



Ao final desta fase o backend deverá fornecer uma API suficientemente completa para que, na Fase 4, o frontend possa implementar:



1\. Login

2\. Cadastro e consulta de empresas

3\. Cadastro e consulta de motoristas

4\. Cadastro e consulta de veículos

5\. Configuração de contratos

6\. Configuração de dedicados

7\. Configuração de motivos de indisponibilidade

8\. Criação de agendamentos

9\. Atualização de agendamentos

10\. Inclusão/remoção/substituição de SPOT

11\. Alteração de status operacional

12\. Encerramento de operação

13\. Consulta da Torre de Controle

14\. Consulta do histórico operacional

15\. Consulta dos logs/auditoria

16\. Configurações do sistema



A Fase 3 deve garantir que esses recursos estejam consistentes e prontos para consumo pelo frontend.



============================================================

3\. REGRA FUNDAMENTAL

============================================================



NÃO criar frontend.



NÃO criar HTML.



NÃO criar React.



NÃO criar CSS.



NÃO criar componentes visuais.



NÃO implementar mapa.



NÃO implementar GPS.



NÃO implementar rastreamento em tempo real.



NÃO implementar WebSocket/SSE nesta fase, salvo se existir uma necessidade arquitetural comprovada para preparar uma interface futura.



A Fase 3 é BACKEND/API.



============================================================

4\. PRINCÍPIO DE COMPATIBILIDADE

============================================================



As Fases 1, 2 e 2.9 já foram aprovadas.



Não quebre funcionalidades existentes.



Antes de alterar qualquer comportamento:



1\. identifique o comportamento atual;

2\. identifique a razão da alteração;

3\. verifique os testes existentes;

4\. faça a menor alteração possível.



Não faça refatorações generalizadas.



Não altere nomes de entidades existentes sem necessidade.



Não altere contratos da API sem justificativa.



Não remova endpoints existentes.



============================================================

5\. AUDITORIA INICIAL DA FASE 3

============================================================



Antes de escrever código, produza internamente um mapa:



REQUISITO

→ ENDPOINT EXISTENTE?

→ SERVICE EXISTENTE?

→ MODEL EXISTENTE?

→ TESTE EXISTENTE?

→ ESTÁ COMPLETO?

→ PRECISA ALTERAÇÃO?



Depois implemente somente as lacunas.



Não pare a execução simplesmente porque algumas funcionalidades já existem.



============================================================

6\. GESTÃO DE MOTORISTAS

============================================================



Garantir que o backend permita:



\- cadastrar motorista;

\- editar motorista;

\- ativar/desativar motorista;

\- consultar motorista;

\- consultar status operacional;

\- identificar categoria;

\- identificar vínculos dedicados;

\- identificar veículo associado.



O cadastro deve distinguir:



DEDICADO



e



SPOT.



Não duplicar informação que já possa ser obtida por relacionamento.



============================================================

7\. GESTÃO DE VEÍCULOS

============================================================



Garantir:



\- cadastro;

\- edição;

\- ativação/desativação;

\- placa;

\- tipo;

\- especialidade;

\- status cadastral;

\- identificação do veículo físico.



Especialidades:



SECO

REFRIGERADO



A placa deve permanecer validada pelo backend.



Não confiar em validação do frontend.



============================================================

8\. VÍNCULO MOTORISTA + VEÍCULO

============================================================



Garantir que o backend consiga responder:



\- qual veículo pertence ao motorista dedicado;

\- qual motorista está associado ao veículo;

\- qual empresa possui o vínculo;

\- se o vínculo está ativo;

\- qual configuração contratual originou o vínculo.



As regras implementadas na Fase 2.9 devem permanecer intactas:



\- motorista dedicado não pode estar ativo em duas empresas;

\- veículo dedicado não pode estar ativo em duas empresas.



Não remover essas proteções.



============================================================

9\. CONTRATOS

============================================================



Garantir API para:



\- criar configuração contratual;

\- consultar configuração vigente;

\- consultar configurações históricas;

\- alterar configuração futura;

\- ativar/desativar configuração quando aplicável.



A configuração deve permitir representar:



EMPRESA

↓

TIPO DE VEÍCULO

↓

QUANTIDADE CONTRATADA

↓

VIGÊNCIA



Exemplo:



LATAM



HR = 4

Fiorino = 4

Truck = 2



Total = 10



IMPORTANTE:



Alterações futuras não podem alterar registros históricos.



============================================================

10\. AGENDAMENTO

============================================================



Consolidar o fluxo:



RASCUNHO

↓

PROGRAMADO

↓

EM\_EXECUCAO

↓

CONCLUIDO



ou:



PROGRAMADO

↓

CANCELADO



Respeitar as transições já implementadas.



Não criar novas transições arbitrariamente.



============================================================

11\. JANELA DE AGENDAMENTO

============================================================



Manter a regra:



DIA ATUAL:

permitido até o horário limite configurado.



DIA SEGUINTE:

permitido.



O horário padrão é:



12:00



Mas deve continuar configurável.



O agendamento do dia seguinte pode ser atualizado ao longo do dia atual.



Exemplo:



Dia atual:

20/08



É permitido:



20/08 até o limite configurado

21/08



E durante o dia 20/08 o agendamento do dia 21/08 pode ser alterado.



Não permitir programação para datas arbitrariamente futuras se isso não estiver previsto pela regra atual.



============================================================

12\. COMPOSIÇÃO DE DEDICADOS

============================================================



Ao criar um agendamento para empresa com dedicados:



o backend deve conseguir montar a composição com base na configuração contratual vigente.



Exemplo:



LATAM:



4 HR

4 Fiorino

2 Truck



A solicitação deve representar essas vagas separadamente.



Motoristas dedicados já vinculados devem ser utilizados automaticamente.



Quando um dedicado estiver indisponível:



ELE CONTINUA OCUPANDO A VAGA.



Exemplo:



4 HR contratados



1 DISPONÍVEL

1 PROGRAMADO

1 EM\_ROTA

1 INDISPONÍVEL



Total:



4



============================================================

13\. SPOT

============================================================



Garantir operações:



\- adicionar SPOT;

\- remover SPOT;

\- substituir SPOT;

\- consultar SPOT;

\- verificar disponibilidade.



SPOT não deve alterar a capacidade contratual dedicada.



Exemplo:



Contrato:



4 HR



SPOT:



+2



Indicador deve continuar:



Contratados = 4



SPOT = 2



Não:



Contratados = 6



============================================================

14\. STATUS OPERACIONAL

============================================================



Consolidar:



DISPONIVEL

PROGRAMADO

EM\_ROTA

INDISPONIVEL



Garantir transições coerentes.



O backend deve registrar:



\- status anterior;

\- novo status;

\- data/hora;

\- usuário;

\- motivo, quando aplicável;

\- motorista;

\- veículo;

\- empresa;

\- agendamento relacionado, quando existir.



============================================================

15\. INDISPONIBILIDADE

============================================================



Ao alterar para:



INDISPONIVEL



deve existir:



motivo\_indisponibilidade\_id



válido e ativo.



Os motivos devem continuar sendo configuráveis.



Exemplos:



\- Avaria

\- Manutenção

\- Ausência do motorista

\- Problema documental

\- Acidente

\- Problema mecânico

\- Problema operacional

\- Outro



Não permitir alteração para indisponível sem justificativa.



============================================================

16\. LIBERAÇÃO NO MESMO DIA

============================================================



Manter a regra:



Se um motorista/veículo terminar seu atendimento e ficar:



DISPONIVEL



ele pode ser reutilizado no mesmo dia.



Exemplo:



08:00–10:00

Empresa A



10:00

DISPONIVEL



11:00–13:00

Empresa B



PERMITIDO.



Porém:



08:00–10:00

Empresa A



09:00–11:00

Empresa B



BLOQUEADO.



Não alterar essa regra.



============================================================

17\. CONCORRÊNCIA

============================================================



As proteções implementadas na Fase 2.9 são obrigatórias.



Não removê-las.



Toda nova operação que possa criar ou modificar uma AlocacaoOperacional deve utilizar o mesmo mecanismo seguro de concorrência.



Procure por qualquer caminho alternativo que permita:



\- inserir alocação;

\- substituir alocação;

\- alterar status;

\- liberar recurso;

\- reutilizar recurso;



sem passar pela proteção transacional existente.



Se encontrar um caminho inseguro, corrija.



============================================================

18\. TORRE DE CONTROLE

============================================================



Consolidar os endpoints de leitura da Torre.



A API deverá conseguir fornecer:



\### RESUMO GERAL



Quantidade de:



\- veículos contratados;

\- disponíveis;

\- programados;

\- em rota;

\- indisponíveis;

\- vagas não preenchidas;

\- SPOT.



\### POR EMPRESA



Para cada empresa:



\- nome;

\- total contratado;

\- composição contratual;

\- disponíveis;

\- programados;

\- em rota;

\- indisponíveis;

\- vagas não preenchidas;

\- SPOT.



\### POR TIPO DE VEÍCULO



Exemplo:



HR:

4 contratados



Fiorino:

4 contratados



Truck:

2 contratados



============================================================

19\. REGRA DE INDICADORES

============================================================



Manter a fórmula validada na Fase 2.9:



CONTRATADOS =

PROGRAMADOS

\+

EM\_ROTA

\+

DISPONIVEIS

\+

INDISPONIVEIS

\+

VAGAS\_NAO\_PREENCHIDAS



Não contar um mesmo recurso duas vezes.



SPOT deve ser apresentado separadamente.



============================================================

20\. DETALHAMENTO OPERACIONAL

============================================================



A API de detalhamento deve permitir ao futuro frontend identificar:



\- empresa;

\- motorista;

\- veículo;

\- placa;

\- categoria;

\- especialidade;

\- status;

\- motivo de indisponibilidade;

\- agendamento;

\- horário;

\- tipo de operação;

\- usuário responsável pela última alteração.



Deve ser possível filtrar por:



\- empresa;

\- data;

\- status;

\- categoria;

\- tipo de veículo;

\- placa;

\- motorista.



Não implemente filtros desnecessários.



============================================================

21\. HISTÓRICO OPERACIONAL

============================================================



Garantir consulta dos eventos:



\- alteração de status;

\- entrada em rota;

\- saída de rota;

\- disponibilidade;

\- indisponibilidade;

\- motivo;

\- liberação;

\- substituição.



Cada evento deve permitir identificar:



QUEM

QUANDO

O QUE

ANTES

DEPOIS

POR QUÊ



Os eventos operacionais permanecem IMUTÁVEIS.



Não criar endpoints de UPDATE/DELETE para eventos históricos.



============================================================

22\. HISTÓRICO DE AGENDAMENTO

============================================================



O backend deve permitir consultar:



\- criação;

\- alteração;

\- inclusão de motorista;

\- remoção;

\- substituição;

\- alteração de horário;

\- alteração de composição;

\- inclusão/remoção de SPOT;

\- cancelamento.



Registrar:



\- usuário;

\- data/hora;

\- ação;

\- estado anterior;

\- estado posterior.



============================================================

23\. AUDITORIA

============================================================



Verificar se todas as operações críticas possuem autoria obtida do JWT.



Nunca confiar em:



usuario\_id



enviado pelo frontend como fonte de verdade.



O usuário deve ser derivado da autenticação.



============================================================

24\. USUÁRIOS E PERMISSÕES

============================================================



Avaliar a estrutura atual de usuários.



Garantir pelo menos:



\- autenticação;

\- usuário ativo/inativo;

\- identificação do usuário;

\- papel/perfil existente.



Se já existir estrutura de autorização, consolidá-la.



NÃO criar um sistema complexo de RBAC se ele não estiver previsto.



Por enquanto precisamos apenas preparar o backend para que futuramente diferentes perfis possam receber permissões sem quebrar a arquitetura.



============================================================

25\. CONFIGURAÇÕES DO SISTEMA

============================================================



Garantir API para consultar e alterar configurações permitidas.



Principal configuração atual:



horario\_limite\_agendamento\_dia\_atual



Valor padrão:



12:00



Não permitir que o frontend altere diretamente variáveis de ambiente.



Configurações operacionais devem estar no banco quando forem parametrizáveis.



============================================================

26\. API CONSISTENTE

============================================================



Faça uma revisão dos endpoints existentes.



Padronize apenas inconsistências reais.



Verifique:



\- métodos HTTP;

\- status codes;

\- schemas de entrada;

\- schemas de saída;

\- paginação;

\- filtros;

\- erros;

\- autenticação.



Evite respostas estruturalmente diferentes para operações semelhantes sem justificativa.



============================================================

27\. TRATAMENTO DE ERROS

============================================================



Para regras de negócio conhecidas, o frontend precisa receber respostas previsíveis.



Exemplos:



\- motorista indisponível;

\- veículo ocupado;

\- conflito de horário;

\- veículo dedicado já vinculado;

\- agendamento fora da janela;

\- transição de status inválida;

\- motivo de indisponibilidade ausente;

\- configuração contratual inexistente.



Não retornar stack trace.



Não expor detalhes internos do PostgreSQL.



Não transformar indiscriminadamente todos os erros em 400.



Utilize códigos HTTP coerentes.



============================================================

28\. PAGINAÇÃO

============================================================



Analise endpoints de listagem que poderão crescer:



\- motoristas;

\- veículos;

\- empresas;

\- agendamentos;

\- eventos;

\- auditoria.



Se ainda não houver paginação e o endpoint puder crescer significativamente, implemente uma estratégia simples e consistente.



Preferir:



page

page\_size



ou equivalente.



Não implementar paginação onde o conjunto seja naturalmente pequeno, como configurações ou enums.



============================================================

29\. FILTROS POR DATA

============================================================



Todos os filtros temporais devem respeitar:



America/Bahia.



Nunca criar novas conversões independentes.



Utilizar:



app/core/datetime\_utils.py



Testar principalmente:



00:00

23:59

mudança de dia

mudança de contrato

agendamento do dia atual

agendamento do dia seguinte.



============================================================

30\. DOCUMENTAÇÃO DA API

============================================================



Garantir que o OpenAPI gerado pelo FastAPI esteja compreensível.



Os endpoints devem possuir:



\- descrição;

\- parâmetros claros;

\- schemas;

\- respostas relevantes;

\- autenticação quando necessária.



Não é necessário escrever documentação extensa manualmente.



O objetivo é que o frontend consiga consumir a API através do contrato OpenAPI.



============================================================

31\. CONTRATO PARA O FRONTEND

============================================================



Antes de concluir a Fase 3, faça uma revisão específica pensando no frontend.



Para cada tela futura, confirme quais endpoints serão necessários.



\### LOGIN



\- login

\- usuário atual



\### MOTORISTAS



\- listar

\- detalhar

\- criar

\- editar

\- status



\### VEÍCULOS



\- listar

\- detalhar

\- criar

\- editar

\- status



\### EMPRESAS



\- listar

\- detalhar

\- criar

\- editar



\### CONTRATOS



\- configuração vigente

\- histórico

\- nova configuração



\### AGENDAMENTO



\- criar

\- consultar

\- editar

\- adicionar SPOT

\- remover SPOT

\- substituir SPOT

\- alterar status



\### TORRE



\- resumo geral

\- resumo por empresa

\- detalhamento



\### OPERAÇÃO



\- alterar status

\- consultar eventos

\- consultar histórico



\### CONFIGURAÇÕES



\- motivos

\- horário limite

\- configurações do sistema



Se faltar algum recurso realmente necessário, implemente.



============================================================

32\. HEALTH CHECK

============================================================



Manter:



GET /health



Garantir que ele informe corretamente:



\- status;

\- projeto;

\- ambiente;

\- timezone.



Não remover.



============================================================

33\. BANCO DE DADOS

============================================================



Qualquer alteração estrutural deve utilizar Alembic.



Antes de criar migration:



\- verificar modelo atual;

\- verificar migrations existentes;

\- evitar duplicidade;

\- evitar alterar histórico.



Testar:



upgrade



e, quando aplicável:



downgrade.



============================================================

34\. TESTES

============================================================



A suíte atual possui 21 testes aprovados.



NÃO remover nenhum.



A Fase 3 deve adicionar testes para cada funcionalidade nova ou alteração significativa.



Criar testes para:



\- CRUD;

\- filtros;

\- agendamento;

\- alteração;

\- status;

\- histórico;

\- Torre;

\- contratos;

\- configurações;

\- autorização;

\- erros;

\- regressão.



A suíte completa deve continuar passando.



============================================================

35\. TESTES DE REGRESSÃO

============================================================



Executar obrigatoriamente:



python -m pytest



ou o comando equivalente utilizado atualmente pelo projeto.



O resultado deve ser informado.



Nenhuma funcionalidade aprovada das Fases 1, 2 e 2.9 pode regredir.



============================================================

36\. SEGURANÇA

============================================================



Verificar:



\- JWT;

\- autenticação;

\- autorização existente;

\- senhas;

\- secrets;

\- CORS;

\- exposição de dados;

\- logs.



Não fazer uma grande refatoração de segurança nesta fase.



Corrigir somente problemas necessários para que a API esteja adequada para o frontend.



O JWT\_SECRET\_KEY hardcoded identificado anteriormente permanece como pendência de produção, salvo se sua correção for necessária neste momento.



============================================================

37\. PERFORMANCE

============================================================



Analise consultas da Torre de Controle.



Procure:



\- N+1 queries;

\- joins desnecessários;

\- carregamento excessivo;

\- consultas repetidas;

\- ausência evidente de índices.



Não faça otimização prematura.



Corrija apenas gargalos evidentes.



Não introduza Redis, Celery ou cache nesta fase sem necessidade comprovada.



============================================================

38\. ARQUITETURA

============================================================



Preservar:



MODULAR MONOLITH



Não criar microservices.



Não separar o banco por serviço.



Não introduzir filas apenas por "escalabilidade futura".



A arquitetura deve ser:



SIMPLIFICADA

\+

MODULAR

\+

TESTÁVEL

\+

EVOLUTIVA



A futura escala será tratada quando houver necessidade real.



============================================================

39\. PREPARAÇÃO PARA FUTURO MAPA

============================================================



Não implementar mapa.



Porém, não acople o domínio operacional a uma futura solução de mapa.



A entidade operacional deve permitir futuramente associar informações como:



\- latitude;

\- longitude;

\- timestamp;

\- localização.



Não adicionar esses campos agora sem necessidade.



Apenas evite decisões que tornem essa evolução impossível.



============================================================

40\. DOCUMENTAÇÃO

============================================================



Atualizar:



CHANGELOG.md



e:



docs/operacao.md



somente com as alterações realmente realizadas.



Se houver nova decisão arquitetural importante, documentá-la.



============================================================

41\. REGRA CONTRA OVERENGINEERING

============================================================



Não implemente:



\- microservices;

\- event bus;

\- Kafka;

\- Redis;

\- Celery;

\- WebSockets;

\- GPS;

\- mapas;

\- IA;

\- notificações;

\- aplicativos mobile;

\- monitoramento avançado;



apenas porque podem ser úteis no futuro.



A arquitetura deve estar PREPARADA para evolução, não implementar antecipadamente tudo que poderá existir.



============================================================

42\. CRITÉRIO DE CONCLUSÃO

============================================================



A Fase 3 somente estará concluída quando:



1\. todas as lacunas necessárias do backend forem identificadas;

2\. as funcionalidades necessárias forem implementadas;

3\. os endpoints estiverem consistentes;

4\. a API estiver pronta para consumo pelo frontend;

5\. os testes existentes continuarem passando;

6\. novos testes estiverem implementados;

7\. migrations estiverem aplicadas;

8\. documentação estiver atualizada;

9\. não houver regressões nas Fases 1, 2 e 2.9.



============================================================

43\. RELATÓRIO FINAL

============================================================



Ao concluir, entregue um relatório técnico.



Não responda simplesmente:



"Fase 3 concluída."



O relatório deve conter:



\------------------------------------------------------------

1\. VEREDITO EXECUTIVO

\------------------------------------------------------------



FASE 3 APROVADA



ou



FASE 3 NÃO APROVADA



\------------------------------------------------------------

2\. FUNCIONALIDADES ANALISADAS

\------------------------------------------------------------



Tabela:



Requisito

Já existia?

Alterado?

Implementado?

Arquivos



\------------------------------------------------------------

3\. IMPLEMENTAÇÕES REALIZADAS

\------------------------------------------------------------



Liste todas as alterações.



\------------------------------------------------------------

4\. ENDPOINTS

\------------------------------------------------------------



Liste os endpoints novos e alterados.



Formato:



Método

Endpoint

Descrição

Autenticação

Status



\------------------------------------------------------------

5\. BANCO DE DADOS

\------------------------------------------------------------



Liste:



\- migrations;

\- tabelas alteradas;

\- índices;

\- constraints.



\------------------------------------------------------------

6\. TESTES

\------------------------------------------------------------



Informar:



Testes anteriores:

X



Novos testes:

Y



Total:

Z



Resultado:



X passed



Não inventar cobertura percentual.



\------------------------------------------------------------

7\. REGRESSÃO

\------------------------------------------------------------



Confirmar explicitamente:



Fase 1:

OK / FALHA



Fase 2:

OK / FALHA



Fase 2.9:

OK / FALHA



\------------------------------------------------------------

8\. API PARA FRONTEND

\------------------------------------------------------------



Informar se todas as operações necessárias para a Fase 4 estão disponíveis.



\------------------------------------------------------------

9\. PENDÊNCIAS

\------------------------------------------------------------



Separar:



OBRIGATÓRIAS ANTES DA FASE 4



e



FUTURAS



\------------------------------------------------------------

10\. VEREDITO

\------------------------------------------------------------



Responder exatamente:



FASE 3 APROVADA — PRONTA PARA FASE 4



ou:



FASE 3 NÃO APROVADA — CORREÇÕES NECESSÁRIAS



============================================================

44\. REGRA FINAL

============================================================



A Fase 3 é a última fase de backend antes do frontend.



Portanto, seja criterioso.



Não invente funcionalidades.



Não replique código.



Não altere regras aprovadas.



Não quebre a Fase 2.9.



Não implemente frontend.



Não avance para a Fase 4 automaticamente.



Primeiro entregue o relatório final.



A próxima decisão será tomada somente depois da análise desse relatório.

