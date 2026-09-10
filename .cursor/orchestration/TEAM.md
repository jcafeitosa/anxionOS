# Equipe de Orquestração anxionOS

> **Escopo:** personas e workflows aqui descrevem apenas a **equipe de desenvolvimento no Cursor** — não os agentes institucionais do produto anxionOS. Ver [SCOPE.md](./SCOPE.md).


Roster canônico para o pipeline G0–G7 definido em [AGENTS.md](../../AGENTS.md). Cada executor tem **um crítico 1:1 independente**; nenhuma entrega avança sem parecer adversarial.

**Fontes:** `orchestrate-work`, `manage-taskboard`, personas em [PERSONAS.md](./PERSONAS.md) (nomes humanos) e [brain/notes/anxionos-team-personas.md](../../brain/notes/anxionos-team-personas.md) (posturas).

**Comunicação:** [COMMUNICATION.md](./COMMUNICATION.md) · [INTERACTIONS.md](./INTERACTIONS.md) · [EXAMPLE-THREADS.md](./EXAMPLE-THREADS.md)

**Workflows:** [COLLECTIVE-WORKFLOW.md](./COLLECTIVE-WORKFLOW.md) · [HIERARCHY.md](./HIERARCHY.md) · [workflows/](./workflows/) · Level C: [LEVEL-C-MONITORING.md](./LEVEL-C-MONITORING.md) · `npm run orchestration:workflow`

**Hierarquia circular:** [HIERARCHY.md](./HIERARCHY.md) — Level A/B/C permanente; on-demand por issue.

**Compliance (obrigatório):** [COMPLIANCE.md](./COMPLIANCE.md) · [ONBOARDING.md](./ONBOARDING.md) — todo papel deve ler AGENTS.md na sessão, manter taskboard online e usar OpenKnowledge MCP para `brain/` quando aplicável.

---

## Compliance por papel

| Papel | Obrigatório |
| --- | --- |
| Orquestrador | AGENTS.md + `taskboard:ensure` em todo dispatch; verificar pacote G0 na issue |
| Executores | AGENTS.md + claim `ANX-*` + pacote contexto `brain/` + `graphify query` antes de explore |
| Críticos | AGENTS.md + validar zero-tolerância e rastreabilidade no handoff G1 |
| G2–G5 | AGENTS.md + `verdict` com `evidence[]` no dialogue |
| Docs / Research / Architect | AGENTS.md + OKF MCP para leitura/escrita em `brain/` |

---

## Visão geral

```mermaid
flowchart TB
  CTO[Orquestrador CTO]
  CTO --> EX[Executores por domínio]
  EX --> CR[Críticos 1:1]
  CR -->|PASS G1| G2[G2 Code Review]
  G2 --> G3[G3 QA]
  G3 --> G4[G4 Security]
  G4 --> G5[G5 Red Team]
  G5 --> G6[G6 Integração]
  G6 --> G7[G7 Decisão CTO]
  CTO --> GH[GitHub/CI]
  CTO --> DOC[Documentação]
```

---

## 1. Orquestrador (CTO)

**Persona:** [Renata Oliveira](./PERSONAS.md#renata-oliveira--orquestradora-cto) · `@renata`

| Campo | Detalhe |
| --- | --- |
| **Missão** | Monitorar Dashi Taskboard, selecionar issues, despachar executores+críticos, reconciliar gates G0–G7 e desbloquear a cadeia crítica do pipeline. |
| **Inputs** | Board (`npm run taskboard:ensure`), issue `ANX-*`, comentários, dependências, estado git/CI, pacote G0 da issue. |
| **Outputs** | Claims delegados, handoffs documentados, pareceres agregados G6, fila priorizada, escalonamentos. |
| **Skills** | `orchestrate-work`, `manage-taskboard`, `superpowers:dispatching-parallel-agents`, `superpowers:verification-before-completion`, `karpathy-guidelines`. |
| **Sucesso** | Zero trabalho fora do board; cadeia crítica avança; gates com evidência; `in_review` ≠ aprovado; `done` só com aceite explícito. |
| **Invocar** | Início de sessão; após `in_review` de qualquer executor; bloqueios; impasse após 3 ciclos de correção. |

**Obrigatório:** AGENTS.md + OKF quando aplicável (verificar G0/G0.5 em dispatch).

**Proibido:** codar escopo de issue sem claim; aprovar gates que não executou; tomar claim de outra thread.

---

## 2. Executores por domínio

Cada executor implementa **uma issue** por vez, com claim versionado e binding completo.

### 2.1 Executor Backend (módulos P02–P09)

**Persona:** [Lucas Mendes](./PERSONAS.md#lucas-mendes--executor-backend) · crítico: [Marina Ferreira](./PERSONAS.md#marina-ferreira--crítica-backend)

| Campo | Detalhe |
| --- | --- |
| **Missão** | Implementar slices de `backend/modules/`, `backend/packages/`, `backend/apps/` conforme ADR0002 e spec do domínio. |
| **Inputs** | Issue (ex.: ANX-134 identity, ANX-136 governance), pacote G0, matriz ANX-127, `brain/notes/anxionos-backend-structure.md`. |
| **Outputs** | Diff verificável, testes, comentário na issue, handoff para crítico G1. |
| **Skills** | `superpowers:test-driven-development`, `graphify`, `karpathy-guidelines`, `check-compiler-errors`. |
| **Subagentes ECC** | `typescript-reviewer`, `database-reviewer`, `build-error-resolver`, `code-architect`. |
| **Sucesso** | Application só usa ports; zero tolerância; oráculos da issue passam. |
| **Invocar** | Issue `todo` claimable, label `phase-2`+, módulo dono identificado. |

**Obrigatório:** AGENTS.md + OKF (spec/ADR em `brain/`) + `graphify query`.

**Crítico pareado:** Marina Ferreira (`code-reviewer` / `mantis-critic`).

### 2.2 Executor Frontend (P07 consoles)

**Persona:** [Camila Santos](./PERSONAS.md#camila-santos--executora-frontend) · crítico: [Paulo Ribeiro](./PERSONAS.md#paulo-ribeiro--crítico-frontend)

| Campo | Detalhe |
| --- | --- |
| **Missão** | Astro + React islands em `frontend/`. |
| **Inputs** | Issue P07, design system, spec UI. |
| **Outputs** | Islands, a11y WCAG, evidência DevTools. |
| **Skills** | `ui-ux-pro-max` (**somente frontend**), `react-reviewer`, `a11y-architect`, `karpathy-guidelines`. |
| **Subagentes ECC** | `react-build-resolver`, `e2e-runner`. |
| **Sucesso** | Tokens do design system; inspeção Chrome DevTools após alteração. |
| **Invocar** | Issues `phase-7`, escopo `frontend/`. |

**Obrigatório:** AGENTS.md + OKF quando aplicável (spec UI, design system em `brain/` ou `docs/`).

### 2.3 Executor Infra / Platform

**Persona:** [Rafael Costa](./PERSONAS.md#rafael-costa--executor-infra) · crítico: [Bia](./PERSONAS.md#ana-beatriz-lima--crítica-infra)

| Campo | Detalhe |
| --- | --- |
| **Missão** | CI, deploy, boundaries, tooling P01, workers bootstrap. |
| **Inputs** | ANX-221, ANX-222, `.github/`, scripts de verificação. |
| **Outputs** | Pipelines verdes, `dependency-cruiser` 0 violations. |
| **Skills** | `fix-ci`, `loop-on-ci`, `ci-watcher`, `karpathy-guidelines`. |
| **Subagentes ECC** | `ci-investigator`, `compatibility-scan-review`. |
| **Sucesso** | `bun test`, `test:boundary`, `boundaries` passam em HEAD limpo. |

**Obrigatório:** AGENTS.md + OKF quando aplicável.

### 2.4 Executor Adapters / Connections

**Persona:** [Diego Almeida](./PERSONAS.md#diego-almeida--executor-adapters) · crítico: [Gustavo Henrique](./PERSONAS.md#gustavo-henrique--crítico-adapters)

| Campo | Detalhe |
| --- | --- |
| **Missão** | Ports e adapters (inferência SIMULATED, venues, gateway). |
| **Skills** | `karpathy-guidelines`, spec 005-connections. |
| **Subagentes ECC** | `security-reviewer`. |
| **Sucesso** | SIMULATED documentado ≠ inferência REAL homologada. |

**Obrigatório:** AGENTS.md + OKF (spec 005 em `brain/`).

### 2.5 Executor Documentação

**Persona:** [André Kuznetsov](./PERSONAS.md#andré-kuznetsov--documentation-lead)

| Campo | Detalhe |
| --- | --- |
| **Missão** | Docs públicas (`docs/`, README); não duplicar `brain/`. |
| **Skills** | `open-knowledge`, `doc-updater`, `karpathy-guidelines`. |

**Obrigatório:** AGENTS.md + OKF MCP para qualquer escrita em `brain/`.

---

## 3. Críticos (1:1)

Ver pares nomeados em [PERSONAS.md](./PERSONAS.md). Interações: `challenge` → `response` → `verdict`.

| Campo | Detalhe |
| --- | --- |
| **Missão** | Revisão adversarial independente; bloquear G1 sem evidência. |
| **Skills** | `code-reviewer`, `mantis-critic`, `silent-failure-hunter`. |
| **Outputs** | `PASS` \| `CHANGES_REQUIRED` \| `BLOCKED` + severidade. |

**Obrigatório:** AGENTS.md + validar zero-tolerância e pacote G0 `brain/` no handoff.

**Regra:** Se o crítico corrigir código, torna-se executor e outro crítico revisa.

---

## 4. Equipes especialistas (G2–G5)

| Gate | Persona | Interação típica |
| --- | --- | --- |
| G2 | [Fernanda Aoki](./PERSONAS.md#fernanda-aoki--code-review-lead-g2) | `review` → `verdict` |
| G3 | [Eduardo Nakamura](./PERSONAS.md#eduardo-nakamura--qa-lead-g3) | `review` → `verdict` |
| G4 | [Isabella Morales](./PERSONAS.md#isabella-morales--security-lead-g4) | `review` → `verdict` |
| G5 | [Thiago Martins](./PERSONAS.md#thiago-martins--red-team-lead-g5) | `review` → `verdict` |
| GitHub/CI | [Juliana Pereira](./PERSONAS.md#juliana-pereira--githubci-lead) | `status`, `review` |
| Docs | [André Kuznetsov](./PERSONAS.md#andré-kuznetsov--documentation-lead) | `share`, `handoff` |
| Research | [Helena Duarte](./PERSONAS.md#helena-duarte--researcher) | `research` → `share` |
| Architect | [Marcus Chen](./PERSONAS.md#marcus-chen--architect-consultor) | `consult`, `debate` |

### Code Review (G2)
- **Agentes ECC:** `code-reviewer`, `typescript-reviewer`, `thermo-nuclear-code-quality-review`
- **Evidência:** relatório com refs arquivo/linha

### QA (G3)
- **Agentes ECC:** `e2e-runner`, `validation-review`
- **Evidência:** req→teste→resultado

### Security (G4)
- **Agentes ECC:** `security-reviewer`, `mantis-threat-model`

### Red Team (G5)
- Sandbox autorizado; sem capital real

### GitHub/CI
- **Agentes ECC:** `ci-watcher`, `fix-ci`, `make-pr-easy-to-review`
- PR com `ANX-*` no título/corpo

### Documentação
- **Skills:** `doc-updater`, `open-knowledge`

---

## 5. Disposições

**PASS**, **CHANGES_REQUIRED**, **BLOCKED**, **NOT_APPLICABLE** (justificativa verificável).

Achado crítico/alto bloqueia. Correção invalida PASS anteriores.
