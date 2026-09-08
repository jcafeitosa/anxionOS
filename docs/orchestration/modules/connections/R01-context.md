---
type: debate
---

# R01 — Contexto: `modules/connections`

**Módulo:** connections (P05 Connections)  
**Rodada:** R1 — Inventário documental e de código  
**Data:** 2026-09-08  
**Issue:** ANX-62 (contrato P05) · **ANX-83** (debate R01–R10)

## Participantes

| Papel | Agente |
| --- | --- |
| Explorador | code-explorer |
| Arquiteto | architect |
| Crítico | critic-reviewer |
| Security | security-reviewer |
| Orquestrador | CTO orchestrator |

## Objetivo da rodada

Consolidar fontes de verdade, código existente e lacunas antes de definir fronteiras (R2) e domínio (R3). Reconciliar inventário estrutural ([structure-debate](../../structure-debate/connections/R01-context.md)) com debate SDD por módulo (padrão organizations/governance). Escopo desta fase: **SIMULATED** e **PAPER** apenas — sem credenciais REAL/live.

## Propósito

Connections é o limite controlado entre o anxionOS e providers, feeds, modelos, ferramentas, contas, venues e serviços externos. O módulo resolve **binding autorizado e observável**, entrega dados normalizados e devolve resultados com proveniência. Não decide estratégia, risco, autoridade institucional nem ledger de capital.

## O que possui / não possui

### Possui (donos de estado ou composição)

- ProviderSubscription, AIAccount, offerings/model catalog
- ConnectionBinding versionado (DRAFT → VALIDATING → ACTIVE → SUSPENDED → REVOKED)
- Quotas, reservas, leases, cooldowns, budgets
- Usage records e health/circuit-breaker por connection
- Runtime adapters (describe, health, invoke, normalize) — contrato, não regra de negócio cross-module
- Inference profiles e routing/pools (fairness PLATFORM vs AGENCY)

### Não possui (fronteiras ADR0002 / brain)

| Item | Dono correto |
| --- | --- |
| Invoice assinatura plataforma | billing |
| Ledger capital / trading | accounting |
| Agent/AgentVersion/skills | agents |
| Goal/Task/Run, WAITING_HUMAN_INPUT workflow | orchestration |
| Grants, mandatos, authorityEpoch | governance |
| RiskPolicy, kill switch | risk |
| Ordens, fills, venue reconciliation | execution |
| Memory/Evidence/Document | knowledge |
| Tokens/credenciais em DTOs, eventos ou grafo | proibido — packages/secrets + infra |

## Dependências

| Direção | Componentes / artefatos |
| --- | --- |
| **Upstream** | identity, organizations, governance (grants/consent/epochs), packages/secrets, packages/eventing, packages/contracts, spec 005 |
| **Downstream** | orchestration (inference invoke, WAITING_HUMAN_INPUT), agents (bindings modelo), knowledge (retrieval), market-data (feeds), billing (usage PLATFORM), evaluation (certificação modelo) |

Gate de implementação: epic **ANX-36** (Wave 4) — debate pode avançar em paralelo; G1 bloqueado até P02/P03/P04 upstream estáveis.

## Armazenamento

| Engine | Dono connections | Notas |
| --- | --- | --- |
| **PostgreSQL** | contas, subscriptions, bindings, quotas, leases, usage | estado + journal + outbox atômico |
| **Neo4j** | provider→conta→oferta→modelo→agente/tarefa; linhagem de custo | projeção a partir de eventos |
| **SQLite** | cache descartável de catálogo público | nunca saldo de quota ou cooldown global |

Fonte: brain/notes/anxionos-storage-ownership.md.

## Inventário documental

| Fonte | Caminho | Relevância |
| --- | --- | --- |
| Estrutura modular (aceita) | brain/notes/anxionos-backend-structure.md | Árvore modules/connections/ subdividida |
| Spec integração P05 | brain/project-docs/specs/005-connections-integration/spec.md | Runtimes, Strategy bindings, fairness, adapters |
| Contrato operacional P05 (repo) | p05-connections-binding-inference-contract.md | Binding versionado, fail-closed (ANX-62) |
| Mapa de armazenamento | brain/notes/anxionos-storage-ownership.md | PG/Neo4j/SQLite por agregado |
| SDD institucional | brain/project-docs/specs/001-institutional-contract/spec.md | AC06, ambientes, ExecutionPermit boundary |
| Spec agents | brain/project-docs/specs/002-agents-knowledge/spec.md | AgentModelBinding, AP04 WAITING_HUMAN_INPUT |
| Capabilities map | CAPABILITY-MAP.md | CAP connections.*, eventos, API /v1/connections/* |
| ADR0002 | brain/project-docs/decisions/0002-adopt-modular-backend-layout.md | Layout modular |

## Inventário de código

| Artefato | Estado | Notas |
| --- | --- | --- |
| backend/modules/connections/ | **Ausente** | Correto para esta fase |
| backend/packages/contracts/src/connections/ | **Ausente** | Contratos P05 a formalizar em R4 |
| backend/packages/secrets | **Ausente** | Pré-requisito P02 |
| backend/modules/governance/ | Parcial (in_review ANX-60) | Grants/epochs alimentam binding |
| backend/modules/identity/ | done (ANX-28 G7) | Principal upstream |
| backend/modules/organizations/ | done (ANX-29 G7) | Agency/tenant scope |

## Debate R1 (síntese atribuída)

**Explorador:** connections é o primeiro módulo P05 na fila. ANX-62 cobre contrato documental P05 (in_review); falta trilha formal modules/connections/ R1–R10.

**Arquiteto:** Fail-closed na resolução: sem grant, secret, epoch ou health válido → erro tipado, sem fallback silencioso.

**Crítico:** REAL_EXECUTION proibido nesta versão — debate R2 deve tornar isso invariante testável.

**Orquestrador:** R1 concluído. Próximo: R2 fronteiras.

## Critérios de aceite — rodadas R02–R10

| Rodada | Artefato | Critérios de saída |
| --- | --- | --- |
| **R02** | R02-boundaries.md | Matriz possui/não possui; REAL_EXECUTION proibido; secrets fora de DTOs |
| **R03** | R03-domain-sketch.md | Agregados Binding, AIAccount, Usage; ports ConnectionResolver, RuntimeAdapter |
| **R04** | R04-contracts.md | Comandos/eventos versionados; alinhamento ANX-62 |
| **R05** | R05-storage.md | Tabelas PG, outbox ownerDomain=connections; projeção Neo4j |
| **R06** | R06-dependencies.md | Grafo upstream/downstream; gates ANX-36 |
| **R07** | R07-risks.md | SSRF, quota race, UNKNOWN state, WAITING_HUMAN_INPUT |
| **R08** | R08-decision-log.md | Decisões RB-D* numeradas |
| **R09** | R09-dev-plan.md | Slices S1–Sn com testes |
| **R10** | R10-g0-handoff.md | PC-G0 checklist 10/10 |

## Saída R1

✅ Context brief aprovado para avançar a **R02 — Fronteiras**.
