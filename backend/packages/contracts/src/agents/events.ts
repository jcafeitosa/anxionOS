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
	AGENT_STATUS_CHANGED: "agents.agent.status_changed.v1",
	AGENT_VERSION_PUBLISHED: "agents.agent_version.published.v1",
	AGENT_VERSION_ROLLED_BACK: "agents.agent_version.rolled_back.v1",
	BRAIN_INVOCATION_REQUESTED: "agents.brain.invocation.requested.v1",
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

export const agentStatusChangedPayloadSchema = z.object({
	agentId: z.string().uuid(),
	organizationId: z.string().uuid(),
	fromStatus: agentLifecycleStatusSchema,
	toStatus: agentLifecycleStatusSchema,
	revision: z.number().int().nonnegative(),
});

export const agentVersionRolledBackPayloadSchema = z.object({
	agentId: z.string().uuid(),
	organizationId: z.string().uuid(),
	fromVersionId: z.string().uuid().optional(),
	toVersionId: z.string().uuid(),
	toVersionNumber: z.number().int().positive(),
	revision: z.number().int().nonnegative(),
});

export const brainInvocationRequestedPayloadSchema = z.object({
	invocationId: z.string().uuid(),
	agentId: z.string().uuid(),
	agentVersionId: z.string().uuid(),
	organizationId: z.string().uuid(),
	capabilityId: z.string().min(1).max(128),
	correlationId: z.string().min(1).max(128),
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
		eventType: z.literal(AGENTS_EVENT_TYPES.AGENT_STATUS_CHANGED),
		payload: agentStatusChangedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(AGENTS_EVENT_TYPES.AGENT_VERSION_PUBLISHED),
		payload: agentVersionPublishedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(AGENTS_EVENT_TYPES.AGENT_VERSION_ROLLED_BACK),
		payload: agentVersionRolledBackPayloadSchema,
	}),
	z.object({
		eventType: z.literal(AGENTS_EVENT_TYPES.BRAIN_INVOCATION_REQUESTED),
		payload: brainInvocationRequestedPayloadSchema,
	}),
]);

export type AgentsEventType =
	(typeof AGENTS_EVENT_TYPES)[keyof typeof AGENTS_EVENT_TYPES];
export type AgentRegisteredPayload = z.infer<
	typeof agentRegisteredPayloadSchema
>;
export type AgentStatusChangedPayload = z.infer<
	typeof agentStatusChangedPayloadSchema
>;
export type AgentVersionPublishedPayload = z.infer<
	typeof agentVersionPublishedPayloadSchema
>;
export type AgentVersionRolledBackPayload = z.infer<
	typeof agentVersionRolledBackPayloadSchema
>;
export type BrainInvocationRequestedPayload = z.infer<
	typeof brainInvocationRequestedPayloadSchema
>;
