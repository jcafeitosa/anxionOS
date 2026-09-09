# Workflows de Orquestração (legado)

**Canônico:** [COLLECTIVE-WORKFLOW.md](./COLLECTIVE-WORKFLOW.md) · [workflows/README.md](./workflows/README.md) · `npm run orchestration:workflow`

Fluxos alinhados a [AGENTS.md](../../AGENTS.md) e skills `orchestrate-work` / `manage-taskboard`.

---

## 1. Ciclo de vida da issue

```mermaid
stateDiagram-v2
  [*] --> backlog
  backlog --> todo: autorizado
  todo --> in_progress: claim versionado
  in_progress --> in_review: executor + crítico G1 PASS
  in_review --> in_progress: CHANGES_REQUIRED
  in_review --> blocked: impedimento
  blocked --> todo: desbloqueado
  in_review --> done: G0-G7 + aceite CTO
```

**`in_review` nunca significa aprovado.**

---

## 2. Workflow Orquestrador

```mermaid
flowchart TD
  A[taskboard:ensure] --> B[list + get]
  B --> C{Elegível?}
  C -->|não| D[Esperar]
  C -->|sim| E[G0 pacote]
  E --> F[Executor + crítico]
  F --> G[claim in_progress]
  G --> H[Monitorar G1]
  H --> I{Crítico PASS?}
  I -->|não| J[Retorno]
  I -->|sim| K[G2-G5]
  K --> L[G6 agregar]
  L --> M[G7 aceite]
```

---

## 3. Executor + Crítico (G1)

```mermaid
sequenceDiagram
  participant O as Orquestrador
  participant E as Executor
  participant C as Crítico
  participant B as Board
  O->>B: claim ANX-N
  O->>E: prompt + G0
  O->>C: prompt adversarial
  E->>E: implementar + verificar
  C->>C: revisar
  E->>C: diff + evidências
  C->>B: parecer G1
  E->>B: in_review
```

---



## 4. Workflow Code Review (G2)

```mermaid
flowchart TD
  A[Handoff G1 PASS] --> B[detect_changes_tool]
  B --> C[get_review_context_tool]
  C --> D[code-reviewer / typescript-reviewer]
  D --> E{Achados crítico/alto?}
  E -->|sim| F[CHANGES_REQUIRED]
  E -->|não| G[PASS G2 → QA]
```

## 5. Workflow QA (G3)

```mermaid
flowchart TD
  A[PASS G2] --> B[Mapear oráculos ANX-N]
  B --> C[Executar bun test / E2E]
  C --> D[Casos negativos]
  D --> E{Falha?}
  E -->|sim| F[CHANGES_REQUIRED]
  E -->|não| G[PASS G3 → Security]
```

## 6. Workflow Security (G4)

```mermaid
flowchart TD
  A[PASS G3] --> B[security-reviewer]
  B --> C[Secrets / tenancy / deps]
  C --> D{Violação?}
  D -->|sim| E[CHANGES_REQUIRED]
  D -->|não| F[PASS G4 → Red Team]
```

## 7. Workflow Red Team (G5)

```mermaid
flowchart TD
  A[PASS G4] --> B[Escopo sandbox]
  B --> C[Cenários adversariais]
  C --> D[Reproduzir + cleanup]
  D --> E{Controle quebrado?}
  E -->|sim| F[CHANGES_REQUIRED]
  E -->|não| G[PASS G5 → G6]
```

## 8. Workflow GitHub/CI

```mermaid
flowchart LR
  A[G6 handoff] --> B[Branch feature/ANX-N]
  B --> C[PR com ANX-N]
  C --> D[ci-watcher]
  D --> E{CI verde?}
  E -->|não| F[ci-investigator → executor]
  E -->|sim| G[Pronto G7 merge]
```

## 9. Workflow Documentação

```mermaid
flowchart TD
  A[Mudança de comportamento] --> B[doc-updater]
  B --> C[Atualizar docs/ proporcional]
  C --> D[Link brain/ se local]
  D --> E[Crítico docs: rastreabilidade]
  E --> F[Comentário na issue]
```

## 10. Workflow Integração G6

```mermaid
flowchart TD
  A[Pareceres G2-G5] --> B{Mesmo digest?}
  B -->|não| C[Revalidar gates]
  B -->|sim| D[Teste integrado]
  D --> E[Filhos resolvidos?]
  E -->|não| F[BLOCKED]
  E -->|sim| G[Handoff G7 CTO Renata]
```

---

## 11. Handoff mínimo

**Executor → Crítico:** diff, comandos+saída, checklist zero tolerância.

**Orquestrador → G2–G5:** issue, digest, ambiente, critérios, retorno.

**G6 → G7:** pareceres consolidados, riscos, PR, solicitação aceite CTO ([CTO-AUTHORITY.md](./CTO-AUTHORITY.md)).

---

## 12. Escalonamento

### blocked
Comentário com causa + issue bloqueadora → `move blocked`.

### CHANGES_REQUIRED
`in_progress` → corrigir → revalidar G1 → repetir gates afetados.

### Impasse (3 ciclos)
Escalar Renata (CTO); Owner só ADR/conflito crítico — não relaxar critérios.

---

## 13. Cadeia crítica (board)

| Issue | Status | Papel |
| --- | --- | --- |
| ANX-221 | in_review | P01 versionamento — G7 pendente |
| ANX-222 | blocked | Commit drift — após ANX-221 |
| ANX-134 | blocked | Identity P02 |
| ANX-136 | todo (deps) | Governance — após ANX-134 |

Snapshot: 222 issues, 0 in_progress, 6 in_review, 44 todo (todos blocked).

---

## 14. Hire on-demand (Level B/C)

Matriz, exemplos e CLI `orchestration:hire` / `dismiss`: [HIRE-DELEGATION.md](./HIRE-DELEGATION.md) · [HIERARCHY.md](./HIERARCHY.md).
