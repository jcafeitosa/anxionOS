---
title: Matriz de prontidão e gates do roadmap
description: Snapshot verificável de issues, dependências e evidências G0-G7 do roadmap anxionOS.
type: plan
status: draft
owner: Produto e engenharia
issue: ANX-54
tags:
  - gates
  - readiness
  - roadmap
  - taskboard
---
# Matriz de prontidão e gates do roadmap

**Issue:** ANX-54  
**Snapshot:** 2026-09-08  
**Status:** draft operacional; nenhum gate é aprovado por este documento.

Esta matriz relaciona o [roadmap executável](./execution-roadmap.md), o [backlog P01/P02](./system-capabilities/p01-p02-backlog.md) e o estado observado no taskboard. `done`, `in_review`, `in_progress` e `todo` são estados de trabalho; não substituem o parecer formal G0–G7.

## Estado observado

| Bloco | Issues principais | Estado observado | Interpretação operacional |
| --- | --- | --- | --- |
| Fundação eventing/contracts | ANX-27, ANX-31, ANX-47 | `done` | Entrega registrada; validar evidência integrada e gates antes de depender como contrato final |
| Identity/organizations | ANX-28, ANX-29 | `done`, `done` | Não assumir paridade institucional completa sem revisar tenancy, epochs e integração |
| Governance | ANX-30 | `done` | Dependência ativa; não promover autorização financeira |
| Intent/permit/ambientes | ANX-48, ANX-49 | `in_review` | Especificação/entrega pendente de parecer independente |
| EffectGate/UNKNOWN | ANX-50 | `in_review` | Sem autorização de efeitos externos até G2–G5 |
| Concorrência/separação | ANX-51, ANX-52 | `in_review` | Evidência de teste e prova negativa ainda precisam ser aceitas |
| Graph Kernel | ANX-32, ANX-33, ANX-34 | `in_review`, `in_review`, `in_review` | P03 incompleto; rebuild e API não são considerados prontos |
| E2E institucional | ANX-35, ANX-36 | `in_progress`, `in_review` | Não há prova integrada do caminho UI → handler → evento → auditoria |
| Runtime orchestration | ANX-53 | `in_review` | S1 parcial; não equivale a P04 completo, autonomia ou L3/L4 |
| Isolamento de fixtures de teste | [ANX-56](./test-fixture-isolation-v1.md) | `in_review` | Contrato de fixture definido; implementação e suíte paralela ainda pendentes |
| Coordenação do roadmap | ANX-54 | `in_progress` | Esta issue consolida dependências, evidências e próximos handoffs |

## Gates formais

| Gate | Evidência mínima | Estado atual |
| --- | --- | --- |
| G0 — preparar | Issue claimada, owner, escopo, dependências, crítico e critérios | Parcial por issue; precisa pacote por unidade |
| G1 — desenvolver | Artefato/revisão exata, testes proporcionais e aprovação explícita do crítico | Não comprovado globalmente |
| G2 — code/design review | Relatório independente sobre contratos, arquitetura, concorrência e migração | Pendente |
| G3 — QA | Casos funcionais, negativos, integração, regressão e E2E executados | Pendente; ANX-35 ainda todo |
| G4 — segurança | Tenancy, autorização, secrets, dependências e trust boundaries | Pendente |
| G5 — red team | Fixture/sandbox, cenários adversariais, reprodução e cleanup | Pendente |
| G6 — integração | Candidato integrado revalidado e evidência não obsoleta | Pendente |
| G7 — aceite/liberação | Aceite explícito e release/rollback autorizados | Pendente |

## Próxima sequência autorizável

1. Finalizar ANX-30 sem tomar ownership de outra conversa.
2. Fechar e revisar ANX-48–52 com evidências concretas anexadas.
3. Revalidar ANX-27/28/29/31/47 como conjunto integrado, incluindo tenancy, idempotência, epochs e boundaries.
4. Completar ANX-32–35 para estabelecer P03 e a primeira prova E2E.
5. Só então preparar G2–G5 para os contratos e grafo; qualquer falha retorna ao executor e invalida aprovações afetadas.
6. Depois do núcleo institucional, avançar W2/W3/W4 do roadmap: agents/orchestration/knowledge, connections e fluxo financeiro SIMULATED/PAPER.

## Bloqueios de liberação

Até existir evidência explícita dos gates aplicáveis, ficam bloqueados:

- qualquer credencial ou ordem `REAL`;
- capital real e integração live com broker/exchange;
- autonomia L3/L4;
- retry cego em `UNKNOWN`;
- promoção automática de StrategyVersion ou AgentVersion;
- autoexpansão de grants, políticas ou orçamento;
- declaração de operação 24/7 ou readiness de produção.

## Regra de atualização

Cada mudança de issue, artefato, digest, teste ou dependência deve atualizar esta matriz ou a evidência específica do pacote. Um PASS antigo não é reutilizado automaticamente após alteração do candidato.

## Reconciliação do snapshot — ANX-66 v4

Atualização baseada no board e nos artefatos disponíveis em 2026-09-08:

| Evidência | Estado atual | Interpretação |
| --- | --- | --- |
| Contratos P01/P02, P05, P06, P07 e P09 | documentados e auditados | prontos para revisão, não são PASS de implementação |
| Contrato operacional P08 | documentado e auditado | readiness definido, SLO/RPO/RTO ainda sem compromisso de produção |
| Matriz dos 23 módulos | documentada e auditada | cobertura de backlog, não prova que os 23 módulos estão implementados |
| Pacote G0-G7 | documentado e auditado | formato de parecer definido, gates ainda precisam de pareceres independentes |
| ANX-58, ANX-62, ANX-63, ANX-64, ANX-68 e ANX-70 | `in_review` | aguardam revisão/aceite; `in_review` não significa PASS |
| ANX-30, ANX-32–35, ANX-53, ANX-55 e demais issues de execução | estado próprio no board | não inferir conclusão a partir deste snapshot; consultar issue e digest atual |

### Pendências que bloqueiam readiness

- G2, G3, G4 e G5 precisam de pareceres independentes para cada candidato;
- G6 precisa reconciliar o candidato integrado, não apenas filhos isolados;
- G7 requer aceite explícito do usuário/revisor;
- testes de produção, capital real, REAL/live e L3/L4 não foram autorizados nem executados;
- qualquer evidência emitida para revisão anterior deve ser revalidada se o working tree ou digest mudar.

Esta seção é um snapshot; o board e os pareceres assinados por digest são a autoridade para o estado corrente.
