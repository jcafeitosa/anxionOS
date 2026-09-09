# Hierarquia circular — anxionOS

> **Escopo:** personas e workflows aqui descrevem apenas a **equipe de desenvolvimento no Cursor** — não os agentes institucionais do produto anxionOS. Ver [SCOPE.md](./SCOPE.md).

Modo **HIERARCHY_CIRCULAR** (default): mandato desce do **núcleo** para anéis A→B→C→Workers; evidência, pareceres e escalações **retornam ao centro** — sem hierarquia morta.

**Relacionados:** [HIRE-DELEGATION.md](./HIRE-DELEGATION.md) · [PERSONAS.md](./PERSONAS.md) · [CTO-AUTHORITY.md](./CTO-AUTHORITY.md) · [COLLECTIVE-WORKFLOW.md](./COLLECTIVE-WORKFLOW.md) · [VISUAL-DOCUMENTATION.md](./VISUAL-DOCUMENTATION.md)

---

## Núcleo circular (centro)

O centro não é um nível A/B/C — é o **hub de autoridade** onde mandato e aceite convergem.

| Papel | Quem | Autoridade |
| --- | --- | --- |
| **Owner** | @Owner (humano) | G7 final, exceções, greenlight, veto |
| **Orquestradora** | Renata (`orchestrator`) | Delegação G0–G6, `decision` operacional, hire override, aceite G7 rotina ([CTO-ACCEPTANCE.md](./CTO-ACCEPTANCE.md)) |
| **Crítica de governança** | Cláudia (`cto-critic`) | Par de Renata — challenge de delegação, evidência G6/G7, hires/escalações; **não** implementa nem decide G7 |

```mermaid
flowchart TB
  subgraph Nucleo["Núcleo circular — centro"]
    Owner["@Owner · G7 final"]
    Renata["Renata · orchestrator"]
    Claudia["Cláudia · cto-critic"]
    Owner <-->|aceite / exceção G7| Renata
    Renata <-->|challenge / verdict governança| Claudia
    Owner -.->|consult / veto| Claudia
  end

  subgraph RingA["Anel A — estratégia"]
    Marcus["Marcus · architect consult"]
  end

  subgraph RingB["Anel B — gates G2–G5 + CI + Docs"]
    BLeads["Fernanda · Edu · Isa · Thiago · Ju · André"]
  end

  subgraph RingC["Anel C — execução + críticos 1:1"]
    CExec["Lucas · Camila · Rafael · Diego"]
    CCrit["Marina · Paulo · Bia · Gustavo"]
  end

  W[Workers on-demand]

  Renata -->|handoff / decision| RingB
  Renata -->|handoff / decision| RingC
  Renata -.->|consult ADR| Marcus
  RingB -->|verdict G2-G5 / escalate| Renata
  RingC -->|G1 PASS / escalate| RingB
  RingC -->|evidência| Renata
  RingC --> W
  W -.->|evidência| RingC
  Claudia -.->|auditoria pipeline| RingB
  Claudia -.->|auditoria pipeline| RingC
```

**Por que Cláudia e não Marina?** Marina é crítica **de domínio** (G1 backend de Lucas). O núcleo exige crítica **de governança** independente — delegação, hires, roteamento de escalação e completude de evidência G6/G7. Misturar os papéis criaria conflito de interesse.

**Regra circular:** nenhum caminho termina em B ou C sem retorno ao núcleo. Escalações, hires fora de domínio e `decision` passam por Renata (+ Cláudia em colaboração); G7 exige @Owner em exceções.

---

## Níveis (anéis externos ao núcleo)

| Nível | Personas permanentes | Papel |
| --- | --- | --- |
| **Núcleo** | @Owner, Renata (`orchestrator`), Cláudia (`cto-critic`) | Autoridade, orquestração, crítica de governança |
| **A** | Marcus (`architect`) | Consult ADR/boundaries — não implementa |
| **B** | Fernanda, Edu, Isa, Thiago, Ju, André | Gate leads G2–G5 + CI + Docs |
| **C** | Lucas/Camila/Rafael/Diego + críticos pareados | Execução G0–G1 + challenge |
| **On-demand** | Workers e specialists | Contratados por issue ([HIRE-DELEGATION.md](./HIRE-DELEGATION.md)); dismiss ao concluir subtask/gate |

---

## Fluxo circular (mandato ↓ evidência ↑)

```mermaid
flowchart LR
  subgraph Center["Núcleo"]
    O["@Owner"]
    R["Renata"]
    C["Cláudia cto-critic"]
  end
  B["Anel B gates"]
  X["Anel C exec+crítico"]
  W["Workers"]

  R -->|delega| B
  R -->|delega| X
  B -->|verdict / escalate| R
  X -->|G1 / escalate| B
  X --> W
  W -->|evidência| X
  X -->|status / handoff| R
  C -->|challenge| R
  R -->|G7 rotina| O
  O -->|aceite / exceção| R
```

---

## Escalação hierárquica (retorno ao centro)

```mermaid
flowchart TD
  W[Worker on-demand] -->|evidência| C[Level C executor/crítico]
  C -->|impasse 3 ciclos| B[Level B gate lead]
  C -->|hire outro domínio| B
  B -->|escalate| N[Renata + Cláudia núcleo]
  C -->|blocked / impasse total| N
  N -->|consult| O["@Owner G7 exceção"]
  N -->|override| B
  N -->|decision G7 rotina| G[done ou CHANGES_REQUIRED]
  O -->|aceite explícito| G
  C -.->|G1 PASS| B
  B -.->|G2-G5 verdict| N
```

---

## Hire delegado B/C

Level **B** e **C** podem contratar membros **da sua equipe/domínio** sem esperar o núcleo. Renata retém **override**, **reject** e auditoria via `hire-log.jsonl`; Cláudia audita hires com `--evidence` incompleto ou fora de escopo.

**Owner override:** @Owner pode vetar qualquer hire ou `decision` G7 — acima de Renata.

Detalhes: [HIRE-DELEGATION.md](./HIRE-DELEGATION.md) · Monitor Level C: [LEVEL-C-MONITORING.md](./LEVEL-C-MONITORING.md)

---

## Autonomia Level C — melhoria do framework

Pares executor↔crítico (anel C) podem **identificar gaps, erros e melhorias** nos artefatos de orquestração do **seu domínio** e **aplicar correções** sem aguardar Renata — com issue `ANX-*` claimada, colaboração do par, broadcast no dialogue e `orchestration:verify` após mudanças materiais.

**Podem:** workflows próprios, entradas em `PERSONAS.md`, `delegation-queue/` do domínio, docs scoped do time.

**Não podem:** política global (HIERARCHY, MANDATORY-COMPLIANCE, CTO-AUTHORITY, hire levels, roster); workflows de outro domínio sem `consult`.

Detalhes, matriz e exemplo Lucas+Marina: [COMPETENCE-BOUNDARIES.md#autonomia-level-c--melhoria-do-framework](./COMPETENCE-BOUNDARIES.md#autonomia-level-c--melhoria-do-framework)


---

## Interação livre dentro da hierarquia

Qualquer persona pode `@mention` qualquer outra no chat e dialogue — respeitando competências exclusivas ([COMPETENCE-BOUNDARIES.md](./COMPETENCE-BOUNDARIES.md)).

| Nível | Interação |
| --- | --- |
| **Núcleo ↔ anéis** | handoff, decision, escalate, consult — retorno obrigatório ao centro |
| **C ↔ C** | consult, debate, share, pair — sem verdict alheio |
| **C → B** | consult, escalate; B emite verdict do seu gate |
| **C → Núcleo** | escalate / blocked (impasse ou hire cross-domain) |
| **B ↔ B** | coordenação multi-gate |
| **Núcleo → todos** | handoff, decision, vote — Renata delega; Cláudia challenge |

Protocolo: [INTER-AGENT-PROTOCOL.md](./INTER-AGENT-PROTOCOL.md) · Roster: [AGENT-ROSTER.md](./AGENT-ROSTER.md) · CLI: `npm run orchestration:who -- --list`
