---
type: debate
---

# R03 — Esboço de domínio: `modules/identity`

**Rodada:** R3  
**Data:** 2026-09-11  
**Histórico:** [structure R03](../../structure-debate/identity/R03-domain-sketch.md)

Agregados: Principal (humano/service), PrincipalStatus ACTIVE|SUSPENDED|REVOKED, SessionRef (não o token), ServiceCredentialRef.

Ports: PrincipalRepository, SessionRevocationPort, IdentityUnitOfWork, PrincipalLookup (export público).

Comandos: RegisterPrincipal, SuspendPrincipal, RevokePrincipal, RecordSessionRevoked.

INV-IDN-01: Principal SUSPENDED impede novos grants (consumer governance).  
INV-IDN-02: UoW estado+journal+outbox.

## Saída R3

Para R4.
