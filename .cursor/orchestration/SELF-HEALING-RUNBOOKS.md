# Self-healing runbooks — framework pointer

> **Canônico (OKF):** `brain/notes/anxionos-self-healing-runbooks.md` — 3 runbooks P1 sandbox (ANX-273).
>
> **Relacionados:** [AI-PRODUCT-COMPANY-ENGINE.md](./AI-PRODUCT-COMPANY-ENGINE.md) §24 · [DECISION-ENGINE-FRAMEWORK.md](./DECISION-ENGINE-FRAMEWORK.md) · [AUTHORITY-LEVELS.md](./AUTHORITY-LEVELS.md)

## Runbooks preautorizados (proposed)

| ID | Nome | DecisionRecord | Ambiente |
| --- | --- | --- | --- |
| `sh-rb-001-redis-pool` | Redis connection pool exhaustion | sim (L4) | staging/dev |
| `sh-rb-002-http-5xx` | HTTP 5xx rate spike — canary restart | não | staging/dev |
| `sh-rb-003-pg-pool` | PostgreSQL connection saturation | sim (L4) | staging/dev |

## Ativação

1. G4 Security (`security-lead`) — `verdict` PASS no runbook
2. DecisionRecord quando coluna "sim" acima
3. Execução apenas sandbox até aceite Owner P2+

**Issue:** ANX-273 (doc) · ANX-279 (executor) · **CLI:** `npm run orchestration:self-healing`
