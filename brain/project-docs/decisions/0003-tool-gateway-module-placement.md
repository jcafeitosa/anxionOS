---
type: decision
title: Colocar Capability & Tool Gateway no módulo tools
description: Recomendar módulo backend/modules/tools para descoberta e execução governada de ferramentas e plugins.
status: draft
decision_status: proposed
date: 2026-09-07
deciders:
  - Owner
tags:
  - decision
  - agents
  - tools
  - architecture
---
# Colocar Capability & Tool Gateway no módulo tools

## Context

O [PRD mestre](../proposals/0001-anxionos-prd-mestre.md) lista **Capability & Tool Gateway** como capacidade distinta de Agents e Connections: descoberta e execução governada de ferramentas e plugins, com dependências de autorização, Agents e Execution.

A [estrutura modular aceita](../../notes/anxionos-backend-structure.md) define 23 módulos em `backend/modules/` sem um dono explícito para esse gateway. Hoje a responsabilidade tende a ser diluída entre `agents/`, `orchestration/` e `connections/` (inferência), o que dificulta contratos de tool-calling, plugins e auditoria uniforme.

## Decision (proposta)

Introduzir **`backend/modules/tools/`** como módulo dono do Tool Gateway:

- Registro e versionamento de capacidades/ferramentas (incl. plugins) com metadados de autorização e escopo.
- Descoberta governada para runtimes de agente (sem bypass de `governance/`).
- Execução com políticas, quotas, tracing e correlação com `orchestration/` (runs/tasks) e `audit/`.
- Integração com `connections/` apenas onde a ferramenta é um adapter de provider externo; inferência LLM permanece em `connections/`.

`agents/` mantém identidade, skills e fachada do Brain; `orchestration/` agenda e retoma trabalho; `tools/` centraliza o contrato de invocação de ferramentas.

## Consequences

- A árvore documentada passa de 23 para **24 módulos** quando implementado; [ADR0002](./0002-adopt-modular-backend-layout.md) exige atualização da nota de estrutura e plano de migração antes de código.
- Reduz acoplamento agents↔providers e clarifica testes de autorização por ferramenta.
- Custo: mais um boundary público (`index.ts`) e eventos de domínio a especificar no SDD/agents spec.

## Status

**Proposto** — não altera o aceite de ADR0002 até revisão do mantenedor e, se aceito, atualização de `anxionos-backend-structure.md` e spec 002-agents-knowledge.
