// ANX-290 — Neo4j bootstrap constraints for GraphNode projections (graph-sandbox homologation).
// Importers: ensureNeo4jGraphConstraints in bootstrap-constraints.ts
// User instruction: runtime evidence for Product Graph projection on live Neo4j.

CREATE CONSTRAINT graph_node_key_unique IF NOT EXISTS
FOR (n:GraphNode) REQUIRE n.nodeKey IS UNIQUE;

CREATE INDEX graph_node_owner_domain IF NOT EXISTS
FOR (n:GraphNode) ON (n.ownerDomain);
