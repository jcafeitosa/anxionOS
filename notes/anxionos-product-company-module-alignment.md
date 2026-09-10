---
type: planning-note
title: AI Product Company — alinhamento de módulos
description: Mapeamento da taxonomia de 30 módulos proposta pelo Owner contra o baseline real de 23 módulos do anxionOS.
status: draft
decision_status: proposed
owner: Produto e engenharia
created: 2026-09-10
version: "0.1"
tags:
  - product-company
  - modules
  - architecture
---
# AI Product Company — alinhamento de módulos

## Resultado da auditoria

O baseline real do backend contém 23 módulos: `accounting`, `adapter-gateway`, `audit`, `billing`, `capital`, `connections`, `decisions`, `evaluation`, `execution`, `governance`, `graph`, `identity`, `knowledge`, `market-data`, `operations`, `orchestration`, `organizations`, `partners`, `performance`, `portfolios`, `risk`, `simulation` e `strategies`.

A taxonomia conceitual do Owner lista 30 módulos. Ela é tratada como mapa de capacidades, não como autorização para criar 30 diretórios ou alterar ownership.

## Correspondência proposta

| Taxonomia Owner | Baseline físico | Classificação |
| --- | --- | --- |
| Governance | `governance` | aderente |
| Organization | `organizations` + `identity` | agrupamento conceitual; ownership separado |
| Agents | `agents` | aderente |
| Agent Teams | `orchestration` + `organizations` | capacidade distribuída |
| Capabilities | `agents` + `contracts/capability-manifest` | transversal, sem novo owner |
| Models | `connections` | models/catalog/bindings |
| Connections | `connections` | aderente e transversal |
| Knowledge | `knowledge` | aderente |
| Graph | `graph` | aderente |
| Products | sem módulo físico confirmado | gap proposto; requer discovery/definition antes de implementação |
| Projects | `orchestration` | Goals/Tasks/Runs e planejamento |
| Tasks | `orchestration` | aderente |
| Engineering | `orchestration` + módulos executores | capacidade organizacional; não novo owner |
| Code | artefatos de repo + `operations` | sem módulo físico confirmado |
| Testing | `evaluation` + `tests` | capacidade distribuída |
| Security | `risk` + `governance` + `audit` | responsabilidade distribuída |
| Deployments | `operations` + `strategies` | separação por domínio |
| Infrastructure | `operations` + `packages`/deploy | aderente como camada operacional |
| Observability | `performance` + `operations` + package observability | transversal |
| Incidents | `operations` | aderente |
| Experiments | `simulation` + `evaluation` | aderente por composição |
| Analytics | `performance` + `market-data` | capacidade distribuída |
| Decisions | `decisions` | aderente |
| Approvals | `governance` | não duplicar em `decisions` |
| Policies | `governance` + `risk` | governance genérico; risk é dono de RiskPolicy |
| Audit | `audit` | aderente |
| Memory | `knowledge` | Memory/Evidence/Document |
| Learning | `evaluation` + `knowledge` + `operations` | ciclo distribuído |
| Marketplace | sem módulo físico confirmado | gap proposto; não criar sem spec |
| Integrations | `connections` + `adapter-gateway` | transversal, sem novo owner global |

## Regras de alinhamento

1. A taxonomia Owner não substitui a árvore aceita em `brain/notes/anxionos-backend-structure.md` e ADR0002.
2. Um conceito sem módulo físico não pode gerar scaffold vazio; exige spec, ownership, storage, eventos e issue `ANX-*` antes de implementação.
3. `Connections` permanece camada transversal para providers, APIs, modelos, MCPs, ferramentas e serviços externos; não concede autoridade de domínio.
4. `Product Graph` e `Agent Graph` são modelos de relação sobre owners existentes; `graph` projeta eventos e não se torna escritor de capital, grants, tasks, modelos ou decisões.
5. `Code`, `Testing`, `Security`, `Analytics`, `Capabilities` e `Engineering` são capacidades compostas enquanto não houver decisão aceita de módulo físico.
6. `governance` mantém autoridade, grants, mandatos e aprovações; `decisions` mantém decisões/intents; `audit` mantém linhagem/replay.
7. Qualquer novo módulo exige ADR ou atualização de decisão arquitetural, spec de domínio e plano de migração; não nasce de uma linha da taxonomia.

## Lacunas verificadas

- Não há evidência suficiente nesta auditoria para afirmar um módulo `products` ou `marketplace` implementado.
- Não há evidência de que Product Graph/Agent Graph tenham projeções de runtime completas para todos os nós da taxonomia.
- A existência de um módulo ou package não prova que seus critérios funcionais estejam implementados ou homologados.
- Testes de integração reais, engines reais, performance e runtime permanecem gates específicos das issues de implementação.

## Próximo passo

Criar issues separadas para os gaps `products` e `marketplace` somente após Product Definition/Architecture; tratar as demais capacidades por contratos e eventos nos owners existentes. A primeira unidade executável segue ANX-265 (Decision Engine contracts), respeitando G0–G7.