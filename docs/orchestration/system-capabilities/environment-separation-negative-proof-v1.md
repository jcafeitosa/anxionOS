---
title: Prova negativa de separação de ambientes v1
description: Testes de boundary/config — SIMULATED/PAPER não alcançam credenciais, contas ou adapters REAL.
type: specification
status: draft
issue: ANX-52
depends_on:
  - ANX-49
  - ANX-50
---
# Environment separation negative proof v1

**Issue:** ANX-52 · **Backlog:** P02-10

## Objetivo

Demonstrar por testes que caminhos SIMULATED e PAPER **não** resolvem:

- adapters com `secretScope: REAL_VENUE`
- contas `isProduction` ou `executionMode: REAL`
- secret refs fora da matriz de scope do modo

## API de prova

| Função | Uso |
| --- | --- |
| `assertDispatchBundleAllowed` | Validação completa adapter + conta + secret antes de dispatch |
| `assertAccountAllowedForMode` | Conta de produção bloqueada em SIM/PAPER |
| `assertSecretRefAllowedForMode` | `REAL_VENUE` bloqueado em SIM/PAPER |
| `scanEnvironmentConfigForLeaks` | Revisão estática de config (CI/review) |

## Códigos adicionais

`ENV_PRODUCTION_ACCOUNT_DENIED`, `ENV_PRODUCTION_SECRET_DENIED`, `ENV_CONFIG_CROSS_MODE_LEAK`.

## Evidência

```
bun test tests/contracts/environment-separation-negative-proof.test.ts
```

## Escopo explícito

Contratos + testes boundary. Sem broker/exchange real, sem secrets em repositório.
