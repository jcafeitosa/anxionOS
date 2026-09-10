---
description: "PC 25 fechado: Policies = governance ponteiro + risk corpo."
status: stable
tags:
  - PC25
  - ANX-375
  - governance
  - risk
title: PC 25 Policies debate M25
type: debate
---
# PC 25 Policies — debate e diagramas (M25)

**Unidade serial:** PC 25 · **Issue:** ANX-375 · **Status documental:** fechado
**Owners:** PolicyReference genérico → `governance`; PolicyVersion kind=RISK → `risk`. **CTO: nao criar pasta `policies`.**

Ver [M01](./anxionos-pc01-governance-debate.md) · D-GOV-002.

## POSSUI

- Ponteiro PolicyReference (governance)
- Corpo RiskPolicy / limites / kill switch (risk)

## NAO POSSUI

- Pasta policies
- RiskPolicy dentro de governance (rejeitado)

```mermaid
flowchart LR
  govRef[PolicyReference] -.->|kind RISK| riskPol[risk PolicyVersion]
  riskPol --> ks[kill switch]
```

## D-GOV-010

Enforcement cross-risk deferido P06. v1 = ponteiro apenas.
