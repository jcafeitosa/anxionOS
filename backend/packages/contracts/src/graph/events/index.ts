/**
 * ANX-277 — barrel for Product/Agent Graph projection event contracts.
 * Re-exported from `@anxionos/contracts/graph` for projectors and workers.
 */
export {
	PRODUCT_GRAPH_OWNER_DOMAIN,
	PRODUCT_GRAPH_EVENT_TYPES,
	workItemStatusChangedPayloadSchema,
	intelligenceFeedsBackPayloadSchema,
	type IntelligenceFeedsBackPayload,
	type ProductGraphEventType,
	type WorkItemStatusChangedPayload,
} from "./product-events";
export {
	AGENT_GRAPH_OWNER_DOMAIN,
	AGENT_GRAPH_EVENT_TYPES,
	decisionRecordedPayloadSchema,
	agentRoleAssignedPayloadSchema,
	type AgentGraphEventType,
	type DecisionRecordedPayload,
	type AgentRoleAssignedPayload,
} from "./agent-events";
