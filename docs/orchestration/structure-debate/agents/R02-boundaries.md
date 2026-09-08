---
type: debate
---

# R02 — Fronteiras: `modules/agents`

**Componente:** modules/agents  
**Rodada:** R2 — Scope boundary  
**Pacote SDD:** P04  
**Data:** 2026-09-08  
**Issue debate:** ANX-42 · próxima issue derivada pós-R10

## Debate R2 (síntese atribuída)

**Arquiteto:** agents é dono de **identidade de agente** (Agent, AgentVersion), **skills declarativas**, **bindings** a Agency/Organization e **fachada Brain** (configuração e invocação governada — não execução de Task/Run).

**Crítico:** O que **não** entra?

**Arquiteto:** Goal/Task/Run/lease → **orchestration**. Grants/T01 → **governance** + graph. Inferência/provider/credencial → **connections**. Memória/evidência/RAG → **knowledge**. Projeção Neo4j de equipe → **graph** projector.

**Security:** AgentVersion nunca carrega secrets de provider; prompts com PII redacted; invocação exige grant + traversal ALLOW.

**Síntese Orquestrador:** Fronteira aceita; R03 domínio na próxima sessão.

## O módulo POSSUI

| Agregado | Responsabilidade |
| --- | --- |
| `Agent` | Identidade estável do agente (CEO, operador, worker) no tenant |
| `AgentVersion` | Snapshot versionado de instruções, skills refs, capabilities |
| `Skill` | Catálogo declarativo (schema extensível por tenant, validado) |
| `AgentBinding` | Vínculo Agent↔Agency/scope; hierarquia TREE/CIRCULAR via governance |
| `BrainFacade` | Porta de invocação síncrona/evento para runtime (sem estado de Run) |

## O módulo NÃO POSSUI

| Item | Dono correto |
| --- | --- |
| Task, Run, lease, heartbeat | orchestration |
| Grant, authorityEpoch, ChangeProposal | governance |
| Nós Agent no grafo institucional | graph (projeção) |
| Provider API keys, OAuth | connections + packages/secrets |
| Documentos, memória longa, evidências | knowledge |
| Checkout ANX-* no taskboard | orchestration mirror |

## Invariantes de fronteira (propostas)

1. `AgentVersion` imutável após publish; mutação = nova versão + evento.
2. Promotion para produção exige evaluation gate (P08) quando aplicável.
3. Brain facade não persiste estado de sessão de Run — delega a orchestration.
4. Skills referenciam contratos em `@anxionos/contracts` — sem strings mágicas em runtime.

## Saída R2

✅ Boundary doc aprovado para R3 (domínio).

**Próximo:** [R03 domain sketch](./R03-domain-sketch.md) — Agent/AgentVersion invariants, ports, eventos `agents.*.v1`. ✅ Concluído (AGT-R03-01..03).
