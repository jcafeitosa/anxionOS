---
type: research
title: Product Company stage hooks — orchestration:phase
description: Integração das 12 etapas Product Company ao CLI orchestration:phase e progress bar.
status: stable
issue: ANX-269
---
# Product Company stage hooks (ANX-269)

## Escopo

Integrar `orchestration:phase` com as **12 etapas Product Company** (PC1–PC12). Issues `ANX-*` reportam etapa atual via lifecycle JSON + inferência de gates.

## Artefatos

| Artefato | Caminho |
| --- | --- |
| Definição PC1–PC12 | `.cursor/orchestration/agent-lifecycle/product-company-stages.mjs` |
| CLI integrado | `.cursor/orchestration/agent-lifecycle/phase-check.mjs` |
| Progress bar | `.cursor/orchestration/agent-workflow/progress-bar.mjs` |
| Testes | `.cursor/orchestration/tests/product-company-stages.test.mjs` |

## CLI

```bash
npm run orchestration:phase -- status --issue ANX-N          # inclui productCompanyStage
npm run orchestration:phase -- company status --issue ANX-N
npm run orchestration:phase -- company set --issue ANX-N --stage PC7
npm run orchestration:phase -- company table
npm run orchestration:progress -- --issue ANX-N              # linha Product Company
```

## Persistência

`.cursor/orchestration-runtime/lifecycle/{issue}.json`:

- `phase` — P0–P7 (existente)
- `productCompanyStage` — PC1–PC12 (novo, override explícito)

## Inferência P4

| Gates pass | Etapa inferida |
| --- | --- |
| G0/G1 | PC7 Development |
| G3 | PC8 Testing |
| G2/G4/G5 | PC9 Code Review |
| G6/G7 | PC10 Release |

Spec: `PRODUCT-COMPANY-MODEL.md` § Relação com LIFECYCLE P0–P7
