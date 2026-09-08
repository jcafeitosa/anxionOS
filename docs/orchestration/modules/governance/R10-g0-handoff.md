---
type: debate
---

# R10 — Pacote G0 (handoff): `modules/governance`

**Rodada:** R10 · **Data:** 2026-09-08 · **Issues:** ANX-40 (debate) · ANX-30 (impl)

## G0 — Escopo ANX-30 v1

### In scope

| Área | Entrega |
| --- | --- |
| Domínio | Grant, Delegation, Mandate, ChangeProposal, Approval, AuthorityEpoch |
| Comandos | IssueGrant, RevokeGrant, CreateDelegation, SubmitChangeProposal, ResolveApproval |
| Queries | ListEffectiveGrants, GetGrantById, GetAuthorityEpoch |
| Persistência | PG governance_* + command journal + outbox |
| Consumer | membership.activated/revoked → grants derivados |
| Port | TraversalEvaluator → graph T01 |
| API | `/v1/agencies/:agencyId/grants` + change-proposals |
| Testes | G3-GOV-01..05, GK03, AR01 |

### Out of scope v1

| Item | Destino |
| --- | --- |
| PolicyVersion RISK body | risk P06 |
| Neo4j projector impl | graph ANX-32 |
| ExecutionPermit emission | decisions P06 |
| PLATFORM engineering grants full matrix | spec 004 defer |

## Equipe G1 (nominal)

| Papel | Agente |
| --- | --- |
| Executor | code-architect |
| Crítico | critic-reviewer |

## PC-G0 avaliação

| ID | Status |
| --- | --- |
| PC-G0-01..03 | ✅ Debate R1–R10 completo |
| PC-G0-04 | ✅ ANX-28 G7 (`done` 2026-09-07) |
| PC-G0-05 | ✅ ANX-29 G7 (`done` 2026-09-07) |
| PC-G0-06 | ⏳ ANX-32 T01 TraversalEvaluator real |
| PC-G0-07..10 | ✅ debate R1–R10, crítico nominal, riscos, escopo |

**Veredito:** G0 debate **aprovado** (PC-G0 **10/10** debate). ANX-40 G7 **`done`**. ANX-30 impl **`done`**; grant events F0 (RB-D04) pendente graph/orchestration upstream.

## Saída R10

✅ G0 aprovado — ANX-40 **`done`** (G7 debate 2026-09-08).
