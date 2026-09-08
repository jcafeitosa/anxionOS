---
type: debate
---

# R07 — Riscos: `modules/agents`

**Componente:** modules/agents  
**Rodada:** R7 — Registro de riscos e preparação G5  
**Pacote SDD:** P04  
**Data:** 2026-09-08  
**Issues:** ANX-82 · ANX-42  
**Pré-requisito:** [R06-dependencies.md](./R06-dependencies.md)

## Objetivo

Registrar riscos v1 de **agents**: prompt injection via Brain, publish sem grant, vazamento de PII em AgentVersion, skill schema extensível malicioso, dependência graph stale em T05, e checklist Red Team G5.

## Registro de riscos (top seleção)

| ID | Risco | L | I | Sev | Mitigação | Gate |
| --- | --- | ---: | ---: | ---: | --- | --- |
| **R-AGT-01** | Publish AgentVersion sem T01 ALLOW | 3 | 5 | 15 | Fail-closed; teste contrato | G4, G5 |
| **R-AGT-02** | PII/secrets em payload AgentVersion | 3 | 5 | 15 | Redaction pipeline; scan CI | G4 |
| **R-AGT-03** | Brain invoke bypass grant | 3 | 5 | 15 | T01 + capability grant antes invoke | G5 |
| **R-AGT-04** | Prompt injection → efeito externo | 4 | 4 | 16 | Kill switch L0; sandbox connections | G5 |
| **R-AGT-05** | Skill schema tenant injection (XXE-like) | 2 | 4 | 8 | Zod strict; size cap | G4 |
| **R-AGT-06** | Graph context stale autoriza ação sensível | 3 | 4 | 12 | T05 nunca substitui T01; stale flag UI | G4 |
| **R-AGT-07** | Cross-tenant agentId reuse | 3 | 5 | 15 | `AgencyScopePort` em todos commands | G5 |
| **R-AGT-08** | Replay `agents.version.published.v1` | 2 | 3 | 6 | Inbox graph + idempotência eventId | G3 |
| **R-AGT-09** | Orchestration stub aceita agentId forjado | 3 | 4 | 12 | Resolver com agents G1; até lá risco residual documentado | G5 |
| **R-AGT-10** | UoW rollback — outbox sem journal | 2 | 5 | 10 | Transação única eventing | G3 |

### Top 5

1. **R-AGT-04** — Prompt injection / autonomia  
2. **R-AGT-01** — Publish sem autorização  
3. **R-AGT-02** — PII em versão  
4. **R-AGT-07** — Cross-tenant  
5. **R-AGT-03** — Brain bypass grant  

## Controles G5 (checklist)

| # | Cenário | Esperado |
| --- | --- | --- |
| G5-AGT-01 | Invoke Brain sem grant | `403 AGT_INVOKE_DENIED` |
| G5-AGT-02 | Publish com T01 DENY | `403 AGT_PUBLISH_DENIED` |
| G5-AGT-03 | AgentVersion com campo `apiKey` | Rejeição validação |
| G5-AGT-04 | Cross-tenant get Agent | `403 AGT_SCOPE_DENIED` |
| G5-AGT-05 | Skill payload > size cap | `400 AGT_SKILL_INVALID` |

**Próximo:** [R08-decision-log.md](./R08-decision-log.md)
