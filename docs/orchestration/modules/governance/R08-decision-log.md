---
type: debate
---
# R08 — Decision log: `modules/governance`

**Rodada:** R8  
**Data:** 2026-09-11 · **Issue:** ANX-40 · pack ANX-389  
**Callers:** [R07-risks.md](./R07-risks.md) · [R09-dev-plan.md](./R09-dev-plan.md). Status **draft** — não `accepted`.

## In / Out (R8)

**In:** D-GOV-001–010 + PC-G0 (ownership grants, T01 em graph, GK03, D-GOV-010 defer P06).

**Out:** este log. **Não** promove spec. **Não** fecha ANX-40/389. Sem ST08 live.

## Non-goals

Não stamp `accepted`. Não fake ST08. Não ANX-342/389 `done`. Não enforcement D-GOV-010 aqui.

## Ownership (log)

| Superfície | Dono |
| --- | --- |
| grants, delegations, mandates, approvals, authorityEpoch | **governance** |
| PolicyVersion RISK / kill switch | **risk** |
| T01 kernel | **graph** |
| adapter-gateway | **KEEP** |

## Decisões consolidadas (D-GOV-001+)

| ID | Decisão | Status |
| --- | --- | --- |
| D-GOV-001 | governance dono grants, delegations, mandates, approvals, authorityEpoch | draft |
| D-GOV-002 | risk dono PolicyVersion RISK e kill switch | draft |
| D-GOV-003 | graph executa T01; governance persiste grants + epoch | draft |
| D-GOV-004 | Prefixo PG `governance_*` + command journal | draft |
| D-GOV-005 | Eventos `ownerDomain: governance`, sufixo `.v1` | draft |
| D-GOV-006 | Consumer membership.activated → grant baseline owner | draft |
| D-GOV-007 | RevokeGrant bump authorityEpoch monotônico (GK03) | draft |
| D-GOV-008 | TraversalEvaluator port público; adapter → graph | draft |
| D-GOV-009 | ChangeProposal HIERARCHY_MODE via ADR0005/spec006 | draft |
| D-GOV-010 | v1 sem PolicyReference enforcement cross-risk (defer P06) | deferido |

## Pré-condições G0 (PC-G0)

| ID | Pré-condição | Status |
| --- | --- | --- |
| PC-G0-01 | R01–R08 debate neste pack | draft |
| PC-G0-02 | R09 plano slices | draft (R09) |
| PC-G0-03 | R10 handoff | draft (R10) |
| PC-G0-04 | identity G7 ANX-28 | pendente |
| PC-G0-05 | organizations membership events em produção | ANX-29 in_review |
| PC-G0-06 | graph T01 adapter testável | ANX-32 |

## Saída R8

Decision log para R9/R10. Pack ANX-389 **não** `done`.

## Decisão pós-R10 — escopo de plataforma e coerência capability × escopo (ANX-462)

Registrada em 2026-09-11 a partir de exploit confirmado na revalidação G4 do ANX-457 (e auditoria própria dos consumidores de `hasCapability`). Este log não tinha decisões `D-GOV-*`; a entrada entra por título e deve ser migrada para a numeração canônica quando o R8 da rodada atual for consolidado.

**Problema.** `governance_grants.scope_id` é `NOT NULL` e `governance_scope_kind` só admitia `agency|organization`: **não existia escopo de plataforma**. Consequências: (a) `hasPlatformConsoleGrant` chamava `hasCapability` sem filtro de escopo, então qualquer grant `console.platform` — inclusive **agency-scoped** — abria o console de plataforma; (b) `issueGrant` aceitava `capability: z.string().min(1)` sem validar coerência com o escopo, e a rota `POST /v1/agencies/:agencyId/grants` é autorizada para `owner|admin|**operator**` da agência; (c) a decisão "sem agência = autoridade de plataforma" do identity (D-IDN-035) era indecidível na base, deixando as rotas globais de identity inalcançáveis com dado real (D-IDN-042). Dois testes **afirmavam** o comportamento vulnerável como esperado.

**Decisão.**

1. Existe escopo de plataforma de primeira classe: valor `platform` em `governance_scope_kind` e identificador canônico `PLATFORM_SCOPE_ID` em `@anxionos/contracts/governance` (constante nomeada, com fonte documentada; reusa o UUID que o dev seed já usava, então nenhum dado muda de significado).
2. `issueGrant` valida coerência: capability platform-only exige escopo plataforma; `scopeKind: "platform"` exige o identificador canônico; o identificador canônico exige `scopeKind: "platform"`. Violação → `GOV_CAPABILITY_SCOPE_MISMATCH` (409).
3. `hasPlatformConsoleGrant` exige o escopo de plataforma.
4. `hasCapability` **não** tem mais o significado "escopo nulo"; o parâmetro é `string` (escopo exato) ou ausente (sem filtro, só para capability scope-agnóstica por contrato).
5. `governance_scope_kind` contém `organization` mas **nenhum módulo possui entidade Organization** (verificado em 2026-09-11): o valor está sem dono e sem produtor. Fica registrado como lacuna a resolver ou remover antes de alguém tratá-lo como autoridade existente.

**Consequência aceita.** Grants `console.platform` com escopo de agência que já existam no banco deixam de autorizar o console — efeito pretendido da correção, documentado na migration `0008`.
