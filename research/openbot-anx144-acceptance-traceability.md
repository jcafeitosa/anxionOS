---
type: research
title: OpenBot — matriz requisito→capacidade→teste (ANX-144)
description: "Rastreabilidade para implementação ANX-144: gateway, tools, computer isolado, audit before/after, takeover."
status: draft
decision_status: proposed
owner: Research
created: 2026-09-10
version: "1.0"
issue: ANX-125
tags:
  - ANX-125
  - ANX-144
  - openbot
  - agents
  - traceability
sources:
  - type: doc
    title: openbot-capability-matrix
    resource: ./openbot-capability-matrix.md
    accessed: 2026-09-10
  - type: doc
    title: 002-agents-knowledge spec
    resource: ../project-docs/specs/002-agents-knowledge/spec.md
    accessed: 2026-09-10
---
# Matriz requisito → capacidade → teste (ANX-144)

**Issue consumidor:** ANX-144 · **Fonte requisitos:** ANX-125 · **Pesquisa:** ANX-124

Esta matriz fecha o entregável de **requisitos** de ANX-125 para ANX-144 implementar. Não autoriza código nem homologação upstream completa.

## Convenção de nomes (homônimos)

| Nome curto | Repositório | Uso em issues |
| --- | --- | --- |
| **CK-OpenBot** | `CopilotKit/openbot` | Baseline funcional enterprise (gateway, computer, audit) |
| **MEET-OpenBot** | `meetopenbot/openbot` | Melhorias de eventos/plugins/cancelamento |

Ver [comparação](./openbot-comparative-reverse-engineering.md) revalidada em ANX-124 (2026-09-10).

## Requisitos ANX-144 (aceite explícito da issue)

| ID | Requisito anxionOS | Capacidade upstream | IDs matriz | Módulo(s) dono | Teste/oracle proposto |
| --- | --- | --- | --- | --- | --- |
| R144-01 | **Gateway** decide antes de efeito externo | Tool authorization + effects audit | CKB18, CKB32 | `governance`, `connections` | Negar tool sem grant → audit row `DENIED` + rule id; permitir → `FORWARD` + second row on effect |
| R144-02 | **Ferramentas** só via contrato governado | Skills/tool-set selection + MCP | CKB15, CKB16, MEET-014 | `agents`, `connections`, `governance` | Discovery não executa; execução exige grant + schema validado; colisão de nome rejeitada |
| R144-03 | **Computador isolado** por agente/tenant | Computer provider + browser workspace | CKB27–CKB31, CKB40 | `operations`, `sandbox` | Container/session por agency; cross-tenant read negado; workspace path jail |
| R144-04 | **Audit before/after** de cada ação material | Audit retention + page-frame evidence | CKB18, CKB35, CKB37 | `audit`, `governance` | Toda tool call: decision row antes; outcome row depois; append-only |
| R144-05 | **Takeover** encerra autoridade anterior | Human computer takeover | CKB29, CKB39 | `operations`, `governance` | Takeover exclusivo revoga stream/token anterior; release retoma bot sem duplicar efeito |
| R144-06 | **Sandbox** sem credencial institucional | Fixtures + dev vault policy | OB04 (spec), MEET-002 | `secrets`, `tests` | CI usa fixtures nomeadas; `INTELLIGENCE_*` vazios → fail-closed; sem mock em `apps/`/`modules/` produção |
| R144-07 | Caminhos **negados auditados** | CEL policy + policy store | CKB32, CKB36 | `governance`, `simulation` | Policy refuse nomeia regra; stale policy impede efeito (dry-run vs carriedOut explícito) |
| R144-08 | **Cancelamento** sem matar geração nova | Shared abort / generation fencing | MEET-010, OB03 | `orchestration` | Oracle meet: acquire A → abort A → acquire B → release A → abort B → B ainda cancelável |

## Mapa requisito → slice plano

| Requisito | Slice plano (A00–A12) | Gate mínimo |
| --- | --- | --- |
| R144-01..02 | A04 | G2 contratos + G4 security grants |
| R144-03,05 | A08 | G5 adversarial sandbox |
| R144-04,07 | A09 | G2 audit + G4 policy |
| R144-06 | A00 + fixtures `backend/tests/` | G3 sem credencial real |
| R144-08 | A03 | G3 concorrência/cancel |

## Dependências externas (não bloqueiam ANX-125 done)

| Dependência | Status evidência | Disposição ANX-144 |
| --- | --- | --- |
| CopilotKit Intelligence | Não homologado E2E (ANX-125 runtime) | Port opcional ou substituição Knowledge+Orchestration — ADR antes de prod |
| LLM providers reais | Fora CI | Fixtures + `connections` SIMULATED documentado |
| Docker computer fleet | Smoke parcial CK | Homologação isolada — ver [runbook](./openbot-homologation-runbook.md) |

## Critério de saída ANX-125 → ANX-144

- [x] Matriz CK/MEET → módulos (`openbot-capability-matrix.md`)
- [x] Spec/plan draft (`002-agents-knowledge/`)
- [x] Verificações runtime preservadas (`openbot-verification-runtime.md`)
- [x] Homônimos documentados (ANX-124 revalidação 2026-09-10)
- [x] Esta matriz R144-* com oracles nomeados
- [x] Runbook homologação smoke sem credenciais institucionais

ANX-144 **não** deve duplicar pesquisa — consumir links acima e implementar deltas.
