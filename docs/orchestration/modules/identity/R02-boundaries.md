---
type: debate
---

# R02 — Fronteiras: `modules/identity`

**Rodada:** R2  
**Data:** 2026-09-11  
**Histórico:** [structure R02](../../structure-debate/identity/R02-boundaries.md)

## POSSUI

Principal, sessão Better Auth (infra), service principals, estado de revogação, command journal identity.

## NÃO POSSUI

Agency/membership (organizations), Grant (governance), provider secrets (connections), Agent (agents).

## Non-goals

Não duplicar authUserId em organizations. Tokens nunca no grafo. SQLite nunca sessão institucional.

## Invariantes

1. Revogação de Principal invalida sessões derivadas (consumer).
2. domain/ sem HTTP Better Auth — ports.
3. Sem FK para organizations.

## Saída R2

Para R3.
