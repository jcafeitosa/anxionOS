---
type: debate
---
# R07 — Riscos: `modules/operations`

**Rodada:** R7 · 2026-09-11 · ANX-389 · ANX-111  
**Callers:** [R06-dependencies.md](./R06-dependencies.md) · [R08-decision-log.md](./R08-decision-log.md) · [ROUNDS.md](./ROUNDS.md).

## Registro

| ID | Risco | L | I | Sev | Mitigação | Gate |
| --- | --- | ---: | ---: | ---: | --- | --- |
| R-OPS-01 | Cross-tenant export/incident | 3 | 5 | 15 | AgencyScopePort + T01 | G4 G5 |
| R-OPS-02 | Export bypass retention | 4 | 5 | 20 | `OPS_RETENTION_DENIED`; job não lê além da política | G3 G4 |
| R-OPS-03 | PII no grafo IMPACTS | 3 | 5 | 15 | só ids de serviço; projector graph | G4 |
| R-OPS-04 | Replay audit no módulo | 2 | 5 | 10 | só `deltaRefId`; Flight Recorder = audit | G2 |
| R-OPS-05 | SQLite como incidente autoritativo | 2 | 5 | 10 | INV-03; PG `operations_incidents` | G2 |
| R-OPS-06 | Kill switch / D-GOV-010 aqui | 2 | 5 | 10 | **Não** — risk P06 | G2 |
| R-OPS-07 | Pasta `infrastructure/` 24º módulo | 2 | 4 | 8 | PC 18 | P1 |
| R-OPS-08 | Health snapshot como grant de trading | 2 | 5 | 10 | ADR0006; G3-OPS-03 | G2 G3 |
| R-OPS-09 | Export BYTEA no PG | 2 | 4 | 8 | object store `resultRef` | G2 |
| R-OPS-10 | Retention DELETE em ledger alheio | 3 | 5 | 15 | G3-OPS-02; política só `operations_*` | G3 |

### Top 5

1. R-OPS-02 export vs retention · 2. R-OPS-01 cross-tenant · 3. R-OPS-10 retention ledger · 4. R-OPS-03 PII grafo · 5. R-OPS-06 D-GOV-010

## Oráculos G3 / G5

| ID | Gate | Esperado |
| --- | --- | --- |
| G3-OPS-01 | G3 | export replay mesmo `idempotency_key` → um job |
| G3-OPS-02 | G3 | retention **não** DELETE accounting/execution |
| G3-OPS-03 | G3 | health snapshot não emite `order.*` |
| G5-OPS-01 | G5 | GET incident outra org → 403 |
| G5-OPS-02 | G5 | export sem grant → 403 |
| G5-OPS-03 | G5 | ST04: apagar SQLite local não muda `operations_incidents` |

## Non-goals deste round

CI/CD real; kill switch; Flight Recorder; spec accepted; ANX-342 done.

## Saída R7

Riscos v1 fechados para R8.
