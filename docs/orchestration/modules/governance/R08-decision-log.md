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

## Decisão pós-R10 — catálogo de capability e emissão de grant por papel (ANX-466)

Registrada em 2026-09-11 a partir do exploit **HIGH NEW-2** da revalidação G4 do ANX-457, reproduzido com PostgreSQL real e boundary Elysia real (`app.handle`). Complementa a entrada do ANX-462: aquela fechou a coerência capability × escopo (variante `console.platform`); esta fecha a **injeção de capability** em si. O achado foi reconfirmado no digest `410c4c07`.

**Problema.** `POST /v1/agencies/:agencyId/grants` era autorizada apenas por papel de membership (`owner|admin|**operator**`) e `issueGrant` aceitava `capability: z.string().min(1)` — string livre. A única coerência existente (ANX-462) barrava capabilities *platform-only*; todo o resto era auto-emitível por qualquer papel de mutação da agência. Cadeia reproduzida: `operator` da agência A emite `identity.admin` para si (**200**) e, com esse grant, chama `POST /v1/identity/principals/<owner-de-A>/revoke` (**200**) — revogação terminal e global do owner. A raiz é uma confusão de vocabulário: o `CapabilityManifest` cataloga **operações** (cada uma com seus `requiredGrants`), não os tokens que um grant carrega; a rota tratava autoridade como texto livre.

**Decisão.**

1. **Fonte única da autoridade de OWNER (G5 FURO 1).** `OWNER_AUTHORITY_CAPABILITIES` vive em `@anxionos/contracts/governance` e é a lista que `hasOwnerAuthority` (aprovação de ChangeProposal INSTITUTIONAL/HIERARCHY_MODE), a baseline CAP-B01 e a classe administrativa usam — não há segunda cópia. `owner.read` **sozinho** já confere autoridade de owner; classificá-lo como "leitura" era a divergência explorada pelo G5 (`operator` emitia `owner.read` a terceiro e o terceiro passava a aprovar proposta institucional).
2. Existe um **catálogo declarado de grant capabilities** no mesmo contrato: baseline owner, identity, agentes, openbot e `console.platform`. Token fora do catálogo → `GOV_CAPABILITY_UNKNOWN` (**400**, sem escrita), e a checagem de existência roda **antes** de qualquer decisão de autoridade (G5 FURO 4) para não vazar o resultado da autorização. O comando `issueGrant` também valida (seed/worker).
3. A **matriz papel × classe** é declarada no contrato: `operator` emite somente capability **operacional**; `owner`/`admin` emitem operacional e administrativa. "Administrativa" = `owner.*` (fonte única) + prefixos explícitos `identity.*`, `governance.*`, `console.*`, nunca inferida do formato da string.
4. **Ninguém concede o que não detém, para nenhuma classe (G5 FURO 2).** O grant derivado é limitado à autoridade efetiva do emissor no escopo da agência ou no escopo `PLATFORM` — inclusive capability operacional de outro módulo, que também é autoridade efetiva (`hasCapability`/fallback de autonomia). Papel é necessário, não suficiente. É o mesmo invariante que `GOV_DELEGATION_EXCEEDS_PARENT` aplica a `Delegation.capabilitySubset`. Violação → `GOV_INSUFFICIENT_AUTHORITY` (**403**, sem escrita).
5. A recusa do ANX-462 **não muda de código**: `console.platform` em escopo de agência continua `GOV_CAPABILITY_SCOPE_MISMATCH` (**409**), porque a coerência de escopo do comando precede qualquer escrita.
6. **Body inválido é 400 nas duas formas (G5 FURO 3):** schema inválido (`ZodError`) e JSON malformado (`SyntaxError` do `request.json()`, antes classificado como 500).

**Consequência aceita.** Um owner/admin de agência **não** cria nenhuma capability que não detenha — inclusive operacional (ex.: `agents.publish`). Provisionar uma capability nova passa a exigir um emissor que já a detenha (autoridade de plataforma, seed ou `createDelegation` a partir de um grant pai), coerente com o princípio de não ampliação. `identity.admin` exige autoridade de plataforma que a detenha — coerente com D-IDN-044 (operação de efeito global exige escopo de plataforma). Como não existe caminho HTTP para emitir grant de plataforma (já registrado no ANX-462), esse provisionamento continua por comando/seed até existir um operador de plataforma provisionado. O repasse do que o emissor detém (ex.: owner repassando `owner.manage`) segue funcionando. `capability` desconhecida e JSON malformado passam a **400**, não 500: o mapeamento de `GovernanceCommandError` ganhou `400 → VALIDATION_ERROR`.

**Impacto em clientes/contrato publicado.** `GOVERNANCE_ERROR_CODES` ganha `GOV_CAPABILITY_UNKNOWN` (aditivo) e `@anxionos/contracts/governance` exporta `OWNER_AUTHORITY_CAPABILITIES`, o catálogo e a matriz (`GRANT_CAPABILITY_CATALOG`, `isKnownGrantCapability`, `isAdministrativeGrantCapability`, `roleMayIssueGrantCapability`). O documento OpenAPI da rota de grants ainda descreve `capability` como `string minLength 1`; a atualização de `apps/api/src/openapi-operations.ts` é do orquestrador (arquivo controlado) e deve registrar o enum do catálogo e os status `400`/`403`/`409` provados por execução.
