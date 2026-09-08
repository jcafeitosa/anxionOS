---
type: guide
---

# Mermaid — guia de compatibilidade (GitHub + Cursor)

**Status:** ativo  
**Escopo:** `docs/orchestration/` e blocos colados em chat Cursor

Diagramas que não renderizam costumam falhar por **caracteres especiais em labels**, `graph` legado, `pie` malformado ou IDs de subgraph inválidos. Use estes templates como fonte de verdade.

## Regras obrigatórias

| Regra | Faça | Evite |
| --- | --- | --- |
| Tipo de grafo | `flowchart TB` ou `flowchart LR` | `graph TD`, `graph LR` |
| Pie | linha 1 `pie`; linha 2 `title Texto`; fatias `"label" : N` | `pie title` na mesma linha; underscores nas labels |
| Labels pie | ASCII com espacos, aspas duplas | `pie title` combinado; em-dash; acentos |
| Quebra de linha | `["linha 1\nlinha 2"]` em flowchart | `<br/>` |
| Subgraph ID | alfanumérico: `subgraph P02["P02 Foundation"]` | `subgraph P02 — x`, underscores só no ID se necessário |
| Arestas | `-->` | `---` como conector entre nós |
| Símbolos em nós | aspas duplas no texto | `+`, `/path/*`, `(nota)` sem necessidade |

## Template — progresso de debates (pie)

Atualize os números conforme [module-queue.md](./module-queue.md).

**Sintaxe correta:** `pie` e `title` em linhas separadas (nunca `pie title ...` na mesma linha).

```mermaid
pie
    title Modulos por status de debate
    "not started" : 20
    "debating" : 1
    "in review" : 1
    "g0 ready" : 1
```

### Fallback Cursor chat (se pie ainda falhar)

Use flowchart — suportado de forma consistente no preview do Cursor:

```mermaid
flowchart TB
    ns["not started 20 modulos"]
    db["debating 1 graph"]
    ir["in review 1 identity"]
    gr["g0 ready 1 organizations"]
```

## Template — árvore backend por pacote SDD (simplificado)

```mermaid
flowchart TB
  subgraph Apps["Apps composition roots"]
    API["apps/api"]
    WRK["apps/workers"]
  end

  subgraph P02["P02 Foundation"]
    ID["identity"]
    ORG["organizations"]
    GOV["governance"]
  end

  subgraph P03["P03 Graph"]
    GR["graph"]
  end

  subgraph P04["P04 Agents and knowledge"]
    AG["agents"]
    ORC["orchestration"]
    KN["knowledge"]
  end

  subgraph P05["P05 Connections"]
    CX["connections"]
  end

  subgraph P06["P06 Investment core"]
    CORE["market-data strategies capital portfolios decisions risk execution accounting performance audit"]
  end

  subgraph P07["P07 Platform and ops"]
    BI["billing"]
    PA["partners"]
    OP["operations"]
  end

  subgraph P08["P08 Evaluation and twin"]
    EV["evaluation"]
    SM["simulation"]
  end

  Apps --> P02
  P02 --> P03
  P03 --> P04
  P04 --> P05
  P04 --> P06
  P05 --> P06
  P06 --> P07
  P06 --> P08
  P04 --> P08
```

## Template — sequência P01–P09 (entrega)

```mermaid
flowchart LR
  P01["P01 Tooling"] --> P02["P02 Foundation"]
  P02 --> P03["P03 Graph"]
  P03 --> P04["P04 Agents"]
  P04 --> P05["P05 Connections"]
  P04 --> P06["P06 Investment"]
  P05 --> P06
  P06 --> P07["P07 Platform"]
  P06 --> P08["P08 Evaluation"]
  P07 --> P09["P09 Launch gates"]
  P08 --> P09
```

## Template — pipeline debate R01–R10 e gates G0–G7

```mermaid
flowchart LR
  subgraph debateRounds ["Debate R1-R10"]
    R1 --> R2 --> R3 --> R4 --> R5 --> R6 --> R7 --> R8 --> R9 --> R10
  end
  R10 --> G0["G0 Preparar"]
  G0 --> G1["G1 Desenvolver e Critico"]
  G1 --> G2["G2 Code Review"]
  G2 --> G3["G3 QA"]
  G3 --> G4["G4 Security"]
  G4 --> G5["G5 Red Team"]
  G5 --> G6["G6 Integrar"]
  G6 --> G7["G7 Aceitar"]
```

## Template — orquestração de sessão Slack

```mermaid
flowchart TB
  START["Abertura Orquestrador"] --> PROPOSE["Proposta Executor"]
  PROPOSE --> CHALLENGE["Desafio Critico"]
  CHALLENGE --> GATES["Antecipacao G2-G5"]
  GATES --> DEBATE["Debate 15 msgs roster completo"]
  DEBATE --> CONSENSO["Consenso e decisoes"]
  CONSENSO --> TRANSCRIPT["Append SLACK-TRANSCRIPTS"]
  TRANSCRIPT --> BOARD["Comentario taskboard"]
  BOARD --> DOC["Atualizar R0N artefato"]
```

## Checklist antes de commitar diagrama

1. Preview no Cursor ou GitHub — bloco abre sem erro.
2. IDs de subgraph só `[A-Za-z0-9]`.
3. Pie: linha 1 so `pie`; linha 2 `title ...`; fatias com aspas; sem underscores se preview falhar.
4. Sem em-dash `—`, `&` ou `+` em labels de pie.
5. Sequence diagrams: nomes de participante curtos; evite `/` e `*` em aliases.

## Referências

- [DEBATE-FORMAT.md](./DEBATE-FORMAT.md)
- [module-development-playbook.md](./module-development-playbook.md)
- [structure-debate/INDEX.md](structure-debate/index.md)
- [module-queue.md](./module-queue.md)
