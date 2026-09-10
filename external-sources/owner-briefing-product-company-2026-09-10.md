---
captured: 2026-09-10
description: Clip local do briefing Owner da taxonomia de 30 capacidades Product Company.
source_kind: local-clip
status: stable
tags:
  - ingest
  - ANX-344
  - owner
  - product-company
title: Briefing Owner Product Company 2026-09-10
type: source
---
# Briefing Owner — taxonomia Product Company (2026-09-10)

**Preservacao bruta (ANX-344).** Fonte: instrucao Owner na sessao de planejamento 2026-09-10 (clip local, sem URL publica). Sem interpretacao alem do texto do briefing.

## Taxonomia de 30 nomes (mapa de capacidades)

1. Governance
2. Organization
3. Agents
4. Agent Teams
5. Capabilities
6. Models
7. Connections
8. Knowledge
9. Graph
10. Products
11. Projects
12. Tasks
13. Engineering
14. Code
15. Testing
16. Security
17. Deployments
18. Infrastructure
19. Observability
20. Incidents
21. Experiments
22. Analytics
23. Decisions
24. Approvals
25. Policies
26. Audit
27. Memory
28. Learning
29. Marketplace
30. Integrations

## Restricoes do briefing (texto aplicado no programa ANX-342)

- 23 modulos fisicos ADR0002 apenas.
- adapter-gateway NAO e 24o modulo aceito (ADR0006).
- Taxonomia de 30 nomes e capability map, nao pastas novas.
- Approvals/Policies → governance (RiskPolicy → risk).
- Products/Marketplace → composto (spec 007), sem pasta fisica.

## Decisao CTO posterior (mesmo dia, M01)

Nao criar pastas `approvals` nem `policies`. Product Graph: Approval/ChangeProposal/PolicyReference → governance; PolicyVersion kind=RISK → risk; DecisionRecord/TradeIntent/ExecutionPermit → decisions.
