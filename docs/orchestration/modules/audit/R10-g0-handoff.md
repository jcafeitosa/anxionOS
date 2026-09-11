---
type: debate
status: draft
---
# R10 — Pacote G0 (handoff): `modules/audit`

**Rodada:** R10 · 2026-09-11  
**Issues:** debate ANX-107 · impl **ANX-108 nao executada** · pack ANX-389  
**Callers:** [R09-dev-plan.md](./R09-dev-plan.md) · [ROUNDS.md](./ROUNDS.md).  
**Status:** `draft`. Sem codigo de produto neste pack. Specs **nao** accepted. ANX-342 permanece `todo`.

## In scope (G0 documental / G1 futuro)

| Area | Entrega |
| --- | --- |
| Dominio | AuditManifest, IndexCursor, ReplaySession (read-only), tap redacted, DeltaRef |
| Persistencia | PostgreSQL manifests/indices/retencao-ponteiro; object store para payload volumoso |
| Grafo | linhagem / Flight Recorder **projecao** via graph; nao segundo ledger |
| Contratos | `audit.*` events; HTTP esboco `/v1/audit` |
| Testes | G3-AUD-* e G5-AUD-* abaixo |

## Out of scope

| Item | Dono |
| --- | --- |
| Journal de dominio | cada modulo + eventing |
| Ledger / reversao | accounting |
| Kill switch / D-GOV-010 | `risk` P06 |
| Logs de aplicacao | observability |
| Incident/export operacional | operations |
| Pasta `policies/` / `approvals/` | **nao criar** |
| ST08 migrations / G1 | Owner + ANX-108 |
| Spec accepted / ANX-342 done | Owner G7 |

## Non-goals

Replay **sem** side-effect de capital (AUD-R02-INV-05). SQLite auxiliar **nunca** unique audit trail. Tap **redacted** — zero secrets em manifesto.

## Equipe G1 (nominal, futuro)

| Papel | Agente |
| --- | --- |
| Executor | backend-executor |
| Critico | backend-critic |

## Oraculos G3 / G5

| ID | Gate | Esperado |
| --- | --- | --- |
| G3-AUD-01 | G3 | replay read-only: zero UPDATE em capital/execution/accounting |
| G3-AUD-02 | G3 | tap dedupe por eventId |
| G3-AUD-S2-01 | G3 | mesmo evento nao duplica manifesto |
| G3-AUD-S3-01 | G3 | ReplaySession exige grant; sem grant 403 |
| G5-AUD-01 | G5 | payload redacted: grep secrets = 0 |
| G5-AUD-02 | G5 | cross-tenant index 403 |
| G5-AUD-03 | G5 | replay nao reabre ordem REAL |

## Ownership (fecho)

AuditManifest, IndexCursor, RetentionPolicy **ponteiro** (politica de apagar blobs de audit, nao ledger). Journal = donos. D-GOV-010 = risk P06.

## Veredito P1

Pack G0 **documental**. **Nao** autoriza G1. Specs 001-005 `draft`. ANX-342 `todo`.

## Saida R10

Handoff G0 fechado para P1. ANX-389 evidencia — nao G7 de produto.
