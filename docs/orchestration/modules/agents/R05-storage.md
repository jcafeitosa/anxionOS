---
type: debate
---
# R05 — Armazenamento: `modules/agents`

**Issue:** ANX-392. Cite [ADR0004](../../../../notes/anxionos-pc-serial-index.md) via mapa storage (PG/Neo4j). Engine normativo: PostgreSQL `agents_*` + journal + outbox. Neo4j só via projector graph. pgvector e Timescale **não** neste módulo. SQLite não é AgentVersion autoritativo. Sem FK cross-module. Sem migration neste pack.
