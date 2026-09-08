---
type: debate
status: draft
---

# R07 — Riscos: `modules/identity`

**Rodada:** R7 — Registro de riscos, ameaças e controles propostos  
**Data:** 2026-09-08  
**Issue:** ANX-77 · implementação P0: ANX-28 (`done`, G7 2026-09-07)

## Participantes

| Papel | Agente |
| --- | --- |
| Crítico | critic-reviewer |
| Security | security-reviewer |
| Red Team | security-reviewer (escopo G5) |
| Arquiteto | architect |

## Objetivo da rodada

Fechar o registro de riscos do módulo **identity** após R6 e evidência ANX-28: vazamento de `authUserId` em eventos, eventType legado, ausência de `suspendPrincipal`, corrida de registro, dependência Better Auth, fail-closed e checklist Red Team.

## Fontes aplicadas

| Fonte | Uso em R7 |
| --- | --- |
| [R06-dependencies.md](./R06-dependencies.md) | P-R6-01/02, downstream adapters |
| [structure-debate/identity/R05-storage.md](../../structure-debate/identity/R05-storage.md) | Payload sem segredos, journal/outbox |
| [structure-debate/identity/R04-contracts-events.md](../../structure-debate/identity/R04-contracts-events.md) | EventTypes versionados |
| `backend/modules/identity/src/application/commands/register-principal.ts` | Gap `authUserId` no payload |
| `backend/tests/identity/get-principal-by-id.test.ts` | Fail-closed suspended |

## Debate R7 (diálogo atribuído)

**Security:** O achado mais concreto no diff ANX-28 é **`authUserId` no payload de outbox** — contradiz R04/R05 e expande superfície em NATS/audit. Bloquear merge de normalização de eventos sem correção (P1).

**Crítico:** P0 `getPrincipalById` com fail-closed está testado — organizations/governance dependem disso. Risco residual: principal **suspended** ainda existe em PG mas queries retornam `null` — correto; risco é **não** emitir `principal.suspended` quando suspend chegar.

**Red Team:** Vetor: race `registerPrincipal` paralelo mesmo `authUserId` — mitigado por UNIQUE `auth_user_id` + idempotência; race email diferente mesmo authUserId — mitigado por transação.

**Síntese Orquestrador:** Registro v1 fechado; P-R6-01/02 elevados a riscos de segurança P1.

---

## Registro de riscos

Severidade = likelihood × impact (escala 1–5). **Top 5** destacados.

| ID | Risco | L | I | Sev | Mitigação (resumo) | Gate |
| --- | --- | ---: | ---: | ---: | --- | --- |
| **R-IDN-01** | `authUserId` vaza em payload outbox/journal (`principal.registered`) | 3 | 4 | **12** | Remover do payload; normalizar eventType P1 | G4 |
| **R-IDN-02** | EventType legado `principal.registered` quebra consumers `*.v1` | 2 | 4 | **8** | Migrar para `identity.principal.registered.v1` + teste contrato | G3 |
| **R-IDN-03** | Principal `suspended` sem evento — downstream ignora fail-closed mas grafo stale | 2 | 4 | **8** | Implementar `suspendPrincipal` + `suspended.v1` P1 | G3, G4 |
| **R-IDN-04** | Race `registerPrincipal` — email duplicado cross-authUserId | 2 | 4 | **8** | UNIQUE email + `PRINCIPAL_EMAIL_TAKEN`; transação | G3 |
| **R-IDN-05** | Identity PG down — organizations/governance fail-closed 503 | 3 | 4 | **12** | `PrincipalLookupUnavailableError`; health agregado | G4 |
| **R-IDN-06** | Sessão BA válida mas Principal suspenso — usuário ainda autenticado HTTP | 3 | 4 | **12** | Consumer `apps/api:identity-sessions:v1` P1; query fail-closed já retorna null | G4, G5 |
| **R-IDN-07** | `resolvePrincipalFromSession` cria Principal sem verificação email BA | 2 | 3 | **6** | Confia em BA; documentar invariante | G4 |
| **R-IDN-08** | Enumeração de `principalId` em rotas futuras | 2 | 3 | **6** | Sem listagem pública v1; rate limit signup | G5 |
| **R-IDN-09** | Email PII em evento NATS/logs | 2 | 3 | **6** | classification INTERNAL; redact observability | G4 |
| **R-IDN-10** | Adapter governance via organizations — falha organizations quebra governance lookup | 2 | 3 | **6** | Aceito v1; monitorar; defer extrair adapter | G4 |
| **R-IDN-11** | Rollback parcial — commit PG sem outbox | 1 | 5 | **5** | Transação BEGIN/COMMIT em `registerPrincipal` | G3 |
| **R-IDN-12** | Ausência `@anxionos/contracts/identity/*` — drift payload | 2 | 3 | **6** | Criar schemas P1; testes round-trip | G2 |

**Legenda:** L = likelihood, I = impact, Sev = L×I.

---

## Top 5 riscos (retorno executivo)

| ID | Risco | Sev | Mitigação | Gate |
| --- | --- | ---: | --- | --- |
| R-IDN-01 | `authUserId` em evento | 12 | Remover payload P1 | G4 |
| R-IDN-05 | Identity indisponível | 12 | Fail-closed adapters | G4 |
| R-IDN-06 | Sessão BA após suspend | 12 | Consumer sessão P1 | G4, G5 |
| R-IDN-04 | Race registro email | 8 | UNIQUE + transação | G3 |
| R-IDN-03 | Suspend sem evento | 8 | `suspendPrincipal` P1 | G3, G4 |

---

## Deep dive — achados código ANX-28

### 1. Payload outbox inclui `authUserId`

**Evidência:** `register-principal.ts` emite `payload: { principalId, authUserId, email }`.

**Controles propostos:**

| Ação | Detalhe |
| --- | --- |
| Remover `authUserId` do payload | Alinhar R04/R05 |
| Manter `authUserId` só em PG | Coluna `auth_user_id` |
| Teste G4 | Assert outbox snapshot sem `authUserId` |
| Migrar eventType | `identity.principal.registered.v1` |

### 2. Fail-closed suspended (P0 — **mitigado**)

**Evidência:** `get-principal.ts` `toActivePrincipal` retorna `null` para `suspended`; teste `get-principal-by-id.test.ts`.

**Risco residual:** registro suspended direto em PG (bypass application) — mitigação: sem rotas admin v1; migrations controladas.

### 3. Dependência Better Auth

| Cenário | Comportamento |
| --- | --- |
| BA down | Signup/login falha antes de identity |
| BA user sem email | `resolvePrincipalFromSession` pode falhar registro — fail-closed |
| Email BA ≠ email convite org | organizations R07 D-ORG-034 — fora identity v1 |

---

## Decisão P-R6-01 — Normalização eventType

**Posição:** Migrar para `identity.principal.registered.v1` em follow-up P1 (issue dedicada ou slice ANX-28 P1).

**Rationale:** graph consumer e audit esperam sufixo `.v1`; compatibilidade temporária via dual-subscribe no projector **não** autorizada sem ADR.

**Registro:** P-R6-01 **resolvido em nível decisão** — implementação P1.

---

## Decisão P-R6-02 — RLS v1

**Posição:** **Application-only v1** — RLS PostgreSQL **não** obrigatório em `identity_principals` (consistente organizations D-ORG-026).

**Compensação:** fail-closed queries; sem endpoints de listagem; revisão G4 em PR identity.

**Momento RLS:** P09 Launch hardening.

---

## Cenários Red Team (G5)

Executar em sandbox PG + API locais.

### Registro e idempotência

- [ ] Duplo `registerPrincipal` mesmo `authUserId` → um Principal, sem segundo evento
- [ ] Paralelo mesmo email emails diferentes → um sucesso, `PRINCIPAL_EMAIL_TAKEN` ou UNIQUE violation
- [ ] `getPrincipalById` após suspend manual PG → `null`

### Eventos e vazamento

- [ ] Inspecionar outbox após registro — **falha esperada hoje** se `authUserId` presente (documentar achado)
- [ ] Logs não contêm tokens BA

### Downstream fail-closed

- [ ] Simular PG identity down → organizations `CreateAgency` → 503
- [ ] `getPrincipalByAuthUserId` suspended → `null` → rota trata como não autenticado institucionalmente

### Sessão vs institucional

- [ ] Principal suspended em PG; sessão BA ainda válida → **risco R-IDN-06** até consumer P1

---

## Critérios de aceite R7

| # | Critério | Status |
| --- | --- | --- |
| AC-R7-01 | Registro de riscos com L/I/mitigação/gate | ✅ |
| AC-R7-02 | Achados código ANX-28 referenciados | ✅ |
| AC-R7-03 | Decisões P-R6-01/02 com rationale | ✅ |
| AC-R7-04 | Top 5 e checklist G5 | ✅ |

## Pendências para R8

| ID | Assunto | Rodada |
| --- | --- | --- |
| P-R7-01 | Issue P1 para normalização eventos | R08 / taskboard |
| P-R7-02 | Dono consumer sessão suspend | R08 |
| P-R7-03 | Extrair adapter fora organizations | R08 defer |

## Saída R7

✅ Riscos e controles aprovados para R8 (decision log).
