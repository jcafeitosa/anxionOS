---
type: spec
---

# G5 CI sandbox spec — orchestration (S8 / D-ORC-056)

**Issue:** ANX-75 · **Pacote:** P04 `modules/orchestration`  
**Fonte:** [R09-dev-plan.md](./structure-debate/orchestration/R09-dev-plan.md) §Slice 8, §Spike G5 CI sandbox (ORCH-R09-03)

## Objetivo

Especificar automação CI para a matriz G5 adversarial do módulo orchestration **sem** prometer merge gate até evidência verde. O gate manual local (ORCH-R07-08) permanece obrigatório na v1.

## Fixture determinística

| Artefato | Caminho |
| --- | --- |
| Fixture registry | `backend/tests/fixtures/orchestration-g5-sandbox.json` |
| Testes integração HTTP | `backend/tests/orchestration/integration/orchestration-http-api.test.ts` |
| Matriz G5 referência | G3-04, G5-01, G5-06, G5-07 em `orchestration-http-api.test.ts` |

A fixture define `organization`, `principalOwner`, `principalAgent`, `agency`, issues `ANX-901`/`ANX-902`, e `artifactDigest` para gate disposition.

## Critérios go/no-go (ORCH-R09-03)

| Critério | Go CI sandbox | No-go (manual Red Team only) |
| --- | --- | --- |
| Fixture determinística commitada | `orchestration-g5-sandbox.json` verde | Rejeitar CI até fixture |
| Taskboard loopback em CI | Container ou mock HTTP estável | Manual local only |
| HMAC prod flag testável | `ORC_WEBHOOK_HMAC_REQUIRED` inject no job | Skip G5-07 em CI |
| Cleanup truncate idempotente | `backend/tests/orchestration/cleanup.sql` (planejado) | Flaky suites |

**Decisão default v1:** G5 manual sandbox local obrigatório; automação CI especificada aqui sem prometer merge gate até evidência.

## Job CI proposto (não implementado)

```yaml
# Pseudoespecificação — não wired no pipeline até go/no-go
orchestration-g5-sandbox:
  needs: [postgres-service]
  env:
    DATABASE_URL: postgres://anxionos:anxionos@localhost:5432/anxionos
    NODE_ENV: test
    ORC_WEBHOOK_HMAC_REQUIRED: "true"
    TASKBOARD_WEBHOOK_SECRET: ci-fixture-secret
  steps:
    - run: bun test backend/tests/orchestration/integration/orchestration-http-api.test.ts
    - run: psql $DATABASE_URL -f backend/tests/orchestration/cleanup.sql
```

## Cenários G5 cobertos (S7 evidência)

| ID | Cenário | Evidência |
| --- | --- | --- |
| G3-04 / G5-01 | Webhook `done` sem G7 PASS → `ORC_MIRROR_REJECTED` | `orchestration-http-api.test.ts` |
| G5-06 | Cross-tenant `organizationId` tamper → `ORC_SCOPE_DENIED` | idem |
| G5-07 | Webhook sem HMAC quando obrigatório → rejeição | idem |

## Rotas públicas vs admin (OpenAPI Scalar)

| Rota | Auth | Notas |
| --- | --- | --- |
| `POST /v1/orchestration/taskboard/webhook` | HMAC opcional (prod: obrigatório) | Rate limit 60/min/IP |
| `POST /v1/orchestration/taskboard/sync` | Session + org scope | Polling admin/internal |
| Demais `/v1/orchestration/*` | Session + `X-Orchestration-Organization-Id` | Idempotency-Key em comandos |

Documentação interativa: Scalar UI em `/openapi` (Elysia `@elysia/openapi`).

## Deferências relacionadas (S8/S9)

| Item | Status | Referência |
| --- | --- | --- |
| `POST /plan-revisions` | **503 defer** P1 | ORCH-R09-04, D-ORC-055 |
| PlanRevision migration 0002 | Defer S9 | R09 §Migrações |
| G5 CI merge gate | Spec only | D-ORC-056 |
