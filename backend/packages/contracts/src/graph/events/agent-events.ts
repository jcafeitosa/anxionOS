/**
 * ANX-277 — Agent Graph domain event contracts (Zod v1).
 * Importers: `@anxionos/graph` agent-graph-projector, projection worker, graph tests.
 * API: `agents.decision.recorded.v1`, `agents.agent.role_assigned.v1` → Decision / AgentRole nodes.
 * User instruction: implement AI Product Company Engine projection worker sandbox (ANX-277).
 */
import { z } from "zod";

export const AGENT_GRAPH_OWNER_DOMAIN = "agents";

export const AGENT_GRAPH_EVENT_TYPES = {
	DECISION_RECORDED: "agents.decision.recorded.v1",
	AGENT_ROLE_ASSIGNED: "agents.agent.role_assigned.v1",
} as const;

export const decisionRecordedPayloadSchema = z.object({
	decisionId: z.string().uuid(),
	scopeId: z.string().uuid(),
	status: z.string().min(1),
	revision: z.number().int().nonnegative(),
	approverAgentId: z.string().uuid().optional(),
	approvedEntityId: z.string().uuid().optional(),
	approvedEntityKind: z.string().min(1).optional(),
	summary: z.string().min(1).optional(),
});

export const agentRoleAssignedPayloadSchema = z.object({
	agentRoleId: z.string().uuid(),
	companyId: z.string().uuid(),
	agentId: z.string().uuid(),
	personaSlug: z.string().min(1),
	revision: z.number().int().nonnegative(),
	workItemId: z.string().uuid().optional(),
	status: z.string().min(1).default("active"),
});

export type DecisionRecordedPayload = z.infer<typeof decisionRecordedPayloadSchema>;
export type AgentRoleAssignedPayload = z.infer<
	typeof agentRoleAssignedPayloadSchema
>;

export type AgentGraphEventType =
	(typeof AGENT_GRAPH_EVENT_TYPES)[keyof typeof AGENT_GRAPH_EVENT_TYPES];
