---
type: debate
---

# R01 — Contexto: `modules/identity`

**Módulo:** identity (P02)  
**Rodada:** R1  
**Data:** 2026-09-11  
**Issue pack:** ANX-389  
**PC:** [02](../../../../notes/anxionos-pc02-organization-debate.md)  
**Histórico:** [structure R01](../../structure-debate/identity/R01-context.md)

## Participantes

Explorador, Arquiteto, Crítico, Orquestrador.

## Inventário

| Fonte | Relevância |
| --- | --- |
| estrutura ADR0002 | Principal, sessão, service principal |
| storage ADR0004 | PG autoritativo; Neo4j sem tokens |
| spec 001 | R25–R27 auth |
| R06–R10 neste dir | já fat (ANX-77) |

Código P0 ANX-28 done. Pack R01–R05 agora vive **neste** diretório (não só structure-debate).

```mermaid
flowchart LR
  ba[Better Auth sessão] --> pr[Principal]
  pr --> org[organizations membership]
  pr --> gov[governance grant]
```

## Saída R1

Para R2.
