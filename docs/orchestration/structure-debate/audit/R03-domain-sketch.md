---
type: debate
---

# R03 — Esboço de domínio: `modules/audit`

**Issue:** ANX-107

## Agregados

### DeltaRef (**ownerDomain=audit**)
- Dono exclusivo de referências delta para replay/export
- Outros módulos referenciam `deltaRefId` apenas

### FlightRecorderChunk / AuditManifest / ReplaySession / AuditIndex
- Ver R02; replay governado com grant `audit.replay` read-only

## Nota

DeltaRef aponta payload imutável; replay exige grant audit.replay read-only

## Ports

| Port | Uso |
| --- | --- |
| EventConsumerPort | tap all events via eventing router |
| EventEmitterPort | audit.manifest.recorded.v1, audit.replay.requested.v1, audit.replay.completed.v1 |

→ **R04** ([R04-contracts-events.md](./R04-contracts-events.md))
