---
type: debate
---
# R03 — Esboço de domínio: `modules/agents`

**Issue:** ANX-392. Histórico: [structure R03](../../structure-debate/agents/R03-domain-sketch.md).

Agregados: Agent, AgentVersion (imutável após publish), Skill, AgentBinding, BrainFacade (sem estado de Run).

Invariantes: INV-AGT-01 publish não muta versão anterior; INV-AGT-02 invoke exige T01+grant; INV-AGT-03 domain/ sem HTTP/Neo4j/secrets; INV-AGT-04 UoW estado+journal+outbox.

Ports: AgentRepository, AgentVersionRepository, SkillCatalog, PrincipalLookup, TraversalEvaluator, InferenceBindingPort.
