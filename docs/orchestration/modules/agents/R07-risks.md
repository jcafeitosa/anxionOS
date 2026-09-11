---
type: debate
---
# R07 — Riscos: `modules/agents`

**Rodada:** R7  
**Data:** 2026-09-11  
**Issue:** ANX-392

## Registro de riscos

| ID | Risco | L | I | Sev | Mitigação | Gate |
| --- | --- | ---: | ---: | ---: | --- | --- |
| R-AGT-01 | Publish sem T01 ALLOW | 3 | 5 | 15 | Fail-closed | G4 G5 |
| R-AGT-02 | PII/secrets em AgentVersion | 3 | 5 | 15 | ObjectRef + scan CI | G4 |
| R-AGT-03 | Brain invoke bypass grant | 3 | 5 | 15 | T01 + grant antes invoke | G5 |
| R-AGT-04 | Prompt injection → efeito externo | 4 | 4 | 16 | Kill switch L0; sandbox connections | G5 |
| R-AGT-05 | Skill schema injection | 2 | 4 | 8 | Zod strict + size cap | G4 |
| R-AGT-06 | Graph T05 stale autoriza ação | 3 | 4 | 12 | T05 nunca substitui T01 | G4 |
| R-AGT-07 | Cross-tenant agentId | 3 | 5 | 15 | AgencyScopePort em todos commands | G5 |
| R-AGT-08 | Replay version.published | 2 | 3 | 6 | Inbox + eventId | G3 |
| R-AGT-09 | Registry aceita agentId forjado | 3 | 4 | 12 | Resolver só via AgentRegistryPort | G5 |
| R-AGT-10 | Outbox sem journal | 2 | 5 | 10 | UoW única | G3 |
| R-AGT-11 | 24º módulo agent-teams | 2 | 4 | 8 | PC 04 — orchestration + organizations | P1 |
| R-AGT-12 | BrainFacade vira Run store | 3 | 4 | 12 | Non-goal R02 | G2 |

D-GOV-010 **não** é deste módulo (P06 risk).

### Top 5

1. R-AGT-04 prompt injection  
2. R-AGT-01 publish sem autorização  
3. R-AGT-02 PII  
4. R-AGT-07 cross-tenant  
5. R-AGT-03 Brain bypass  

## Controles G5 (oráculos)

| ID | Cenário | Esperado |
| --- | --- | --- |
| G5-AGT-01 | Invoke sem grant | 403 AGT_TRAVERSAL_DENIED |
| G5-AGT-02 | Publish T01 DENY | 403 |
| G5-AGT-03 | Campo apiKey em version | rejeição validação |
| G5-AGT-04 | Cross-tenant GET | 403 AGT_SCOPE_DENIED |
| G5-AGT-05 | Skill > size cap | 400 AGT_SKILL_INVALID |

## Saída R7

Riscos v1 fechados para R8.
