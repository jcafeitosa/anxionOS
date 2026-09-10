import { z } from "zod";
import {
	agentKindSchema,
	agentLifecycleStatusSchema,
	autonomyLevelSchema,
	objectRefSchema,
	skillRefSchema,
} from "./types";

export const AGENTS_OWNER_DOMAIN = "agents";

export const AGENTS_EVENT_TYPES = {
	AGENT_REGISTERED: "agents.agent.registered.v1",
	AGENT_VERSION_PUBLISHED: "agents.agent_version.published.v1",
} as const;

export const agentRegisteredPayloadSchema = z.object({
	agentId: z.string().uuid(),
	organizationId: z.string().uuid(),
	agencyId: z.string().uuid().optional(),
	kind: agentKindSchema,
	displayName: z.string().min(1).max(256),
	status: agentLifecycleStatusSchema,
	revision: z.number().int().nonnegative(),
});

export const agentVersionPublishedPayloadSchema = z.object({
	agentVersionId: z.string().uuid(),
	agentId: z.string().uuid(),
	organizationId: z.string().uuid(),
	versionNumber: z.number().int().positive(),
	capabilityManifestHash: z.string().min(1).max(128),
	autonomyLevel: autonomyLevelSchema,
	instructionRef: objectRefSchema,
	skillRefs: z.array(skillRefSchema).max(64),
	revision: z.number().int().nonnegative(),
});

export const agentsEventPayloadSchema = z.discriminatedUnion("eventType", [
	z.object({
		eventType: z.literal(AGENTS_EVENT_TYPES.AGENT_REGISTERED),
		payload: agentRegisteredPayloadSchema,
	}),
	z.object({
		eventType: z.literal(AGENTS_EVENT_TYPES.AGENT_VERSION_PUBLISHED),
		payload: agentVersionPublishedPayloadSchema,
	}),
]);

export type AgentsEventType =
	(typeof AGENTS_EVENT_TYPES)[keyof typeof AGENTS_EVENT_TYPES];
export type AgentRegisteredPayload = z.infer<
	typeof agentRegisteredPayloadSchema
>;
export type AgentVersionPublishedPayload = z.infer<
	typeof agentVersionPublishedPayloadSchema
>;
