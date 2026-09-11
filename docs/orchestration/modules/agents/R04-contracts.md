---
type: debate
---
# R04 — Contratos e eventos: `modules/agents`

**Issue:** ANX-392. Histórico: [structure R04](../../structure-debate/agents/R04-contracts-events.md).

Eventos `ownerDomain: agents`: `agents.agent.created.v1`, `agents.version.published.v1`, `agents.binding.updated.v1`, `agents.skill.registered.v1`. Sem secrets no payload.

API proposta: `/v1/agents`, `/v1/agents/:id/versions`, `/v1/skills`.

Oráculos: G3-AGT-01 publish imutável; G3-AGT-02 invoke sem grant fail-closed; G5-AGT-01 prompt injection não eleva grant (sandbox).
