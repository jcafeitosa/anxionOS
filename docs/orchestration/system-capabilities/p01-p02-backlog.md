---
title: P01/P02 — Backlog priorizado e critérios verificáveis
description: Backlog de fundação para fechar contratos, eventing, autoridade, modos de execução e reconciliação do anxionOS.
type: plan
status: draft
owner: Produto e engenharia
issue: ANX-45
tags:
  - backlog
  - p01
  - p02
  - readiness
  - governance
---
# P01/P02 — Backlog priorizado e critérios verificáveis

**Issue coordenadora:** ANX-45  
**Status:** draft para revisão do usuário  
**Regra:** itens de implementação só podem iniciar após issue própria em `in_progress`, greenlight aplicável e gates do repositório.

## Dependências já existentes

Não criar duplicatas para:

- ANX-27 — journal/outbox/inbox;
- ANX-28 — identity;
- ANX-29 — organizations;
- ANX-30 — governance;
- ANX-31 — envelope de comando/evento;
- ANX-32–35 — Graph Kernel, API e E2E;
- ANX-40 — debate de governance.

Essas issues são dependências do plano, não estão automaticamente aprovadas nem concluídas.

## Ordem priorizada

| ID | Trabalho | Dependências | Critério verificável | Estado |
| --- | --- | --- | --- | --- |
| P02-01 | Fechar envelope de comando/evento | ANX-27 | Schemas versionados rejeitam envelope incompleto, preservam correlation/causation e passam testes de compatibilidade | ANX-31 |
| P02-02 | Publicar CapabilityManifest v1 | P02-01, ANX-30 | Inventário cobre cada capacidade mutável; cada entrada tem owner, grants, modos, efeitos, idempotência, approval, budget e audit | **ANX-47** (draft manifest v1) |
| P02-03 | Fechar `TradeIntent` e `ExecutionPermit` | P02-01, ANX-28–30 | Intent imutável; permit vinculado por hash, epochs, limites, prazo e single-use; stale/revoked é rejeitado | **ANX-48** (schemas + spec v1) |
| P02-04 | Normalizar ambientes | P02-03 | `SIMULATED`, `PAPER`, `REAL` são enums explícitos; não existe fallback entre ambientes; testes provam isolamento | **ANX-49** (guards + spec v1) |
| P02-05 | Especificar leases, fencing, retry e DLQ | ANX-27 | Consumidor é at-least-once seguro, deduplica, expira lease, não duplica efeito externo e envia poison message à DLQ | ANX-27 |
| P02-06 | Fechar identidade, tenancy, grants e epochs | ANX-28–30 | Toda mutação deriva actor/tenant/grant da sessão; RLS/escopo e revogação tornam intents/permissores stale | ANX-28–30 |
| P02-07 | EffectGate e `UNKNOWN` | P02-03, P02-05 | Nenhum efeito externo sem gate; timeout vira `UNKNOWN`; reconciliação precede retry; kill switch e revogação bloqueiam dispatch | **ANX-50** (guards + spec v1) |
| P02-08 | Fixture E2E UI/SDK → audit | P02-01–07, ANX-35 | O mesmo handler é exercitado por UI e tool; eventos, auditoria, revision e failure path são verificáveis | ANX-35 |
| P02-09 | Concorrência e revogação durante execução | P02-05–07 | Testes de race cobrem lease, epoch bump, permit reuse, duplicate delivery, kill switch e shutdown | **ANX-51** (fixture + race tests) |
| P02-10 | Prova negativa de separação | P02-04, P02-07 | SIMULATED/PAPER não acessam secrets/adapters REAL em testes de boundary e revisão de configuração | **ANX-52** (negative proof tests + spec) |

## Critérios de saída P01/P02

P01/P02 só podem ser considerados prontos quando P02-01 a P02-10 tiverem evidência anexada às issues, os testes obrigatórios passarem e o candidato integrado tiver pareceres G2, G3, G4 e G5. `in_review` no board significa pendente, não aprovado.

## Roadmap posterior

1. P03: Graph Kernel e projeções reconstruíveis, dependente dos contratos.
2. P04: agents, orchestration e knowledge, com ferramentas governadas e checkpoints.
3. P05: connections e inferência governada, sem expor credenciais.
4. P06: fluxo financeiro paper completo: estratégia → decisão → risco → reserva → execução simulada → ledger → portfolio → P&L.
5. P07–P09: consoles Operator/Platform/Partner, operations, evaluation, recovery e readiness.

## Snapshot de execução

Reconciliação com o Dashi Taskboard em 2026-09-08, registrada na ANX-54:

| Escopo | Estado observado | Evidência operacional |
|---|---|---|
| P02-01 envelope/journal/eventing | concluído para revisão | ANX-27 e ANX-31 `done` |
| identidade, organizations e governance | concluído para revisão | ANX-28, ANX-29 e ANX-30 `done`; debate ANX-40 `done` |
| CapabilityManifest | concluído para revisão | ANX-47 `done` |
| TradeIntent/ExecutionPermit | em revisão | ANX-48 `in_review` |
| modos SIMULATED/PAPER/REAL | em revisão | ANX-49 `in_review` |
| EffectGate/UNKNOWN | em revisão | ANX-50 `in_review` |
| concorrência e revogação | em revisão | ANX-51 `in_review` |
| prova negativa de separação | em revisão | ANX-52 `in_review` |
| fixture E2E UI/SDK → audit | em execução | ANX-35 `in_progress` |
| Graph Kernel/API | em revisão | ANX-32, ANX-33 e ANX-34 `in_review` |

`done` e `in_review` continuam sendo estados do board, não aprovação dos gates G2–G7. O candidato integrado ainda requer evidência e pareceres independentes.

## Guardrails permanentes

- Não habilitar `REAL`, capital real, L3/L4 ou credenciais de produção.
- Não usar retry cego em `UNKNOWN`.
- Não permitir autoexpansão de grants, políticas ou orçamento.
- Não tratar Neo4j como ledger ou autoridade financeira.
- Não declarar readiness por documentação, demo ou testes unitários isolados.
