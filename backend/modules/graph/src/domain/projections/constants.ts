/** Consumer durable name for organizations domain projections (R06). */
export const GRAPH_ORGANIZATIONS_CONSUMER_NAME = "graph:organizations:v1";
/** Consumer durable name for governance domain projections (R06 / RB-D04 S9). */
export const GRAPH_GOVERNANCE_CONSUMER_NAME = "graph:governance:v1";
/** Identity consumer — smoke wiring in S4 (full projector deferred). */
export const GRAPH_IDENTITY_CONSUMER_NAME = "graph:identity:v1";
/** Poison pill threshold before automatic quarantine (GK-R07-01). */
export const GRAPH_PROJECTION_MAX_ATTEMPTS = 5;
/** Default checkpoint when journal offset is unavailable in unit tests. */
export const GRAPH_PROJECTION_DEFAULT_CHECKPOINT = 0;
