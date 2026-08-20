# Regras de Negócio — Torre de Controle Logtudo

Este documento especifica as regras de negócio críticas e os comportamentos lógicos exigidos no backend do sistema.

---

## 1. Gestão e Regras de Vigência Contratual

Cada empresa contratante possui regras de quantidade e tipos de veículos dedicados. O sistema deve manter o histórico completo de configurações de contratos de forma contínua e imutável no tempo.

### Regras de Validação de Configurações
1.  **Imutabilidade do Histórico**: Uma configuração de contrato antiga nunca deve ser atualizada ou excluída para alterar o passado. Se as regras mudarem, criamos uma nova vigência.
2.  **Unicidade de Vigência**: Em um determinado instante de tempo, uma empresa deve ter **no máximo uma** configuração contratual vigente.
3.  **Contiguidade Temporal (Sem Sobreposição)**:
    *   Ao criar uma nova configuração para a Empresa $E$ com início em $T_{inicio\_novo}$:
        *   Caso exista uma configuração vigente aberta ($T_{fim}$ é nulo), o sistema deve atualizar essa configuração anterior definindo seu $T_{fim}$ como $T_{inicio\_novo}$.
        *   Caso se tente cadastrar uma nova vigência em um período que intercepta um intervalo fechado já existente ($[T_{inicio}, T_{fim}]$), o sistema deve rejeitar a operação e lançar um erro de validação (HTTP 400 - Conflito de Vigência).
4.  **Resolução de Vigência Histórica**:
    *   Consultas operacionais que buscam a capacidade contratada de uma empresa em uma data $D$ devem buscar o registro onde:
        $$D \ge T_{inicio} \quad \text{e} \quad (T_{fim} \text{ é NULO ou } D < T_{fim})$$

```text
Linha do tempo de exemplo para uma Empresa:

Configuração A: [01/01/2026 00:00:00] ───► [01/09/2026 00:00:00] (Fechada automaticamente)
Configuração B: [01/09/2026 00:00:00] ───► [Indefinido]           (Vigente atual)
```

---

## 2. Vínculo de Motoristas Dedicados

O sistema permite associar motoristas a uma empresa e a um tipo de veículo sob regimes operacionais.

### Regras de Vínculo
1.  **Exclusividade**: Um motorista só pode estar vinculado de forma ativa a **uma única empresa** por vez. O campo `motorista_id` na tabela `motoristas_dedicados_vinculos` possui uma constraint UNIQUE filtrada para registros ativos.
2.  **Categorias Operacionais**:
    *   `DEDICADO`: O motorista atua de forma contínua sob o contrato daquela empresa.
    *   `SPOT`: O motorista realiza viagens esporádicas.
3.  **Vínculo Persistente**: A indisponibilidade de um motorista (férias, atestado, etc.) não remove o motorista do contrato de forma retroativa.
    *   Para encerrar um vínculo, o campo `ativo` deve ser atualizado para `false` com o respectivo timestamp.
    *   Para substituir o motorista João por Pedro na empresa, desativa-se o vínculo de João (`ativo = false`) e cria-se o vínculo de Pedro.

---

## 3. Trilha de Auditoria

Qualquer operação de escrita (Criação, Atualização, Exclusão) em entidades críticas deve ser registrada de forma auditável e indestrutível.

### Entidades Sujeitas a Auditoria
*   `empresas`
*   `motoristas`
*   `veiculos`
*   `contratos_configuracoes`
*   `motoristas_dedicados_vinculos`

### Dados a Serem Capturados
Para cada alteração, a camada de serviço (`services.py`) ou o listener de banco de dados deve registrar na tabela de auditoria:
1.  **ID do Usuário**: UUID do usuário autenticado no JWT (vazio se for processo em lote/automatizado).
2.  **Timestamp**: Data/hora do evento no fuso `America/Bahia`.
3.  **Ação**: `CRIAR`, `ATUALIZAR` ou `DELETAR`.
4.  **Payload Anterior**: Representação JSON de todos os campos da linha afetada antes da modificação (nulo na criação).
5.  **Payload Posterior**: Representação JSON de todos os campos da linha afetada depois da modificação (nulo na exclusão).

---

## 4. Política de Fuso Horário (Timezone America/Bahia)

A Logtudo opera com base no fuso horário de **Salvador/Bahia** (`America/Bahia` / UTC-3).

### Estratégia de Implementação
1.  **Persistência**: Todas as colunas do tipo data/hora no banco de dados usam `TIMESTAMP WITH TIME ZONE` (`TIMESTAMPTZ`). O PostgreSQL armazena nativamente em UTC.
2.  **Entrada da API**: A API aceita strings de data/hora no formato ISO 8601. Se nenhum offset for fornecido, a aplicação assume que o dado está em `America/Bahia` e faz a conversão adequada antes de enviar para o banco.
3.  **Saída da API**: Todas as datas retornadas nas respostas JSON da API FastAPI devem ser formatadas com o fuso horário correspondente a `America/Bahia`, explicitando o offset `-03:00` (ex: `2026-08-19T22:31:35-03:00`).
4.  **Validação Pydantic**: Serializadores customizados do Pydantic garantem a conversão automática dos datetimes de UTC para `America/Bahia` na saída.
