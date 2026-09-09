/** D-GR-026: rebuild batch order by ownerDomain (v1). Remaining domains append alphabetically. */
export const GRAPH_REBUILD_OWNER_DOMAIN_ORDER = [
    "identity",
    "organizations",
    "governance",
    "risk",
    "connections",
];
/** GK-R07-08: block new rebuild when pending inbox exceeds threshold. */
export const GRAPH_REBUILD_PENDING_BLOCK_THRESHOLD = 100_000;
/** Consumer durable names keyed by ownerDomain (R06). */
export const GRAPH_REBUILD_CONSUMER_BY_DOMAIN = {
    identity: "graph:identity:v1",
    organizations: "graph:organizations:v1",
    governance: "graph:governance:v1",
    risk: "graph:risk:v1",
    connections: "graph:connections:v1",
};
/** Terminal rebuild job statuses — no leader lock held. */
export const GRAPH_REBUILD_TERMINAL_STATUSES = ["completed", "failed"];
