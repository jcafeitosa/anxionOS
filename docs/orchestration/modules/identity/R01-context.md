---
type: debate
---

# R01 — Contexto: `modules/identity`

**Módulo:** identity (P02)  
**Rodada:** R1  
**Data:** 2026-09-11  
**Issue pack:** ANX-389 · histórico ANX-42 / ANX-77 · impl P0 ANX-28 (`done`)  
**Callers:** [R02-boundaries.md](./R02-boundaries.md) · [R06-dependencies.md](./R06-dependencies.md) · [ROUNDS.md](./ROUNDS.md). Fatten in-place. Instrução: identity R01–R05.  
**PC:** [02 Organization](../../../../notes/anxionos-pc02-organization-debate.md).  
**Histórico:** [structure R01](../../structure-debate/identity/R01-context.md)

## Propósito

Principal institucional (humano/service), estado de revogação e journal. Better Auth **só** em `apps/api`. Specs 001–005 **draft**. Sem `approvals/`/`policies/`. D-GOV-010 **não** neste módulo (risk P06). ST08 0/23.

## POSSUI

Principal, SessionRef (não o token), ServiceCredentialRef, command journal identity.

## NÃO POSSUI

| Item | Dono |
| --- | --- |
| Agency / membership | organizations |
| Grant / T01 | governance |
| Provider secrets | connections |
| Agent | agents |
| Tokens no grafo | **proibido** |

R06–R10 neste diretório já fat (ANX-77). Este slice alinha R01–R05 à mesma profundidade.

```mermaid
flowchart LR
  ba[Better Auth sessão] --> pr[Principal]
  pr --> org[organizations membership]
  pr --> gov[governance grant]
```

## Saída R1

Para R2.
