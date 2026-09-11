/**
 * ANX-277 — barrel for Product/Agent Graph projection event contracts.
 * Re-exported from `@anxionos/contracts/graph` for projectors and workers.
 */

export {
	AGENT_GRAPH_EVENT_TYPES,
	AGENT_GRAPH_OWNER_DOMAIN,
	type AgentGraphEventType,
	type AgentRoleAssignedPayload,
	agentRoleAssignedPayloadSchema,
	type DecisionRecordedPayload,
	decisionRecordedPayloadSchema,
} from "./agent-events";
export {
	type IntelligenceFeedsBackPayload,
	intelligenceFeedsBackPayloadSchema,
	PRODUCT_GRAPH_EVENT_TYPES,
	PRODUCT_GRAPH_OWNER_DOMAIN,
	type ProductGraphEventType,
	type WorkItemStatusChangedPayload,
	workItemStatusChangedPayloadSchema,
} from "./product-events";
