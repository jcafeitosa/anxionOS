---
type: spec
title: Spec de capacidade — governance (ANX-348)
description: "Fecha gap R01: spec OKF de governance alinhada ao atlas, sem novo módulo físico."
status: stable
tags:
  - governance
  - ANX-348
  - R01
  - spec
---
# Spec de capacidade — governance (gap R01 / ANX-348)

**Status:** accepted como **capability spec** no OKF (não é módulo físico extra).
**Issue:** ANX-348 · alinhada ao [atlas](./anxionos-diagram-atlas.md) e ao [debate M01](./anxionos-pc01-governance-debate.md).

> [!NOTE]
> R01 (ANX-40) apontou lacuna: não há `brain/project-docs/specs/00N-governance/spec.md`. Esta nota fecha o gap **documental** para o programa PC 01–30. Uma spec SDD numerada no tree `project-docs/specs/` permanece opcional até G0 de implementação; não autoriza pasta `approvals` ou `policies`.

## Objetivo

Definir autoridade institucional: quem pode conceder, revogar, delegar, mandatar e **aprovar mudanças** (ChangeProposal), com prova de época para o kernel `graph` (T01).

## Fora de escopo desta spec

- RiskPolicy / kill switch — [D-GOV-002 no R08](./../docs/orchestration/modules/governance/R08-decision-log.md) e spec 003 (authority vs risk)
- DecisionRecord / TradeIntent / ExecutionPermit — módulo `decisions` ([contrato](./anxionos-decision-engine-contract.md))
- Membership — `organizations`
- Traverse Neo4j — `graph`

## Capacidades (taxonomia Owner)

| Nome Owner | Realização |
| --- | --- |
| Governance | módulo `governance` |
| Approvals | agregados Approval + ChangeProposal no mesmo módulo |
| Policies (genérico) | PolicyReference no mesmo módulo |
| Policies (RISK) | `risk` PolicyVersion kind=RISK |

## Requisitos (derivados, rastreáveis)

1. Grant, Delegation, Mandate, Approval, ChangeProposal, AuthorityEpoch persistidos em PostgreSQL do dono (mapa de armazenamento OKF).
2. PolicyReference não duplica corpo; D-GOV-010: sem enforcement cross-risk até P06.
3. IssueGrant / RevokeGrant / ResolveApproval que afete grants bump `authorityEpoch`.
4. T01 ALLOW mutável não cacheado com `intentHash` ativo (graph).
5. Eventos `ownerDomain: governance`, sufixo `.v1`.
6. Consumer `organizations.membership.activated` → grant baseline Owner; revoke membership → grants derivados.

## Critérios de aceite documental (PC 01)

- [x] Fronteira in/out publicada no debate M01
- [x] Mermaid no atlas de módulos (seção governance)
- [x] Decisão CTO: sem pastas `approvals` / `policies`
- [ ] Spec SDD numerada em `project-docs/specs/` — não bloqueia PC 01; follow-up de implementação

## Links

- Debate módulo R01–R10: [ROUNDS](./../docs/orchestration/modules/governance/ROUNDS.md)
- [R02](./../docs/orchestration/modules/governance/R02-boundaries.md)
- [debate M01](./anxionos-pc01-governance-debate.md)
