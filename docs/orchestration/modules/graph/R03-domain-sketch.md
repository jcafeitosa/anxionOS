---
type: debate
---
# R03 — Esboço de domínio: `modules/graph`

Normativo: [schema registry](../../structure-debate/graph/R03-schema-registry.md). Entidades: ProjectionContract, InboxOffset, GenerationMarker. Invariante: mutação Neo4j + marcador no mesmo destino; PG não declara apply antes do commit Neo4j.
