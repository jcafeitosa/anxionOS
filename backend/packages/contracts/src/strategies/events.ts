import { z } from "zod";
import {
	strategiesExecutionModeSchema,
	strategyIdSchema,
	strategyVersionIdSchema,
} from "./types";
export const STRATEGIES_EVENT_TYPES = {
	VERSION_PUBLISHED: "strategies.version.published.v1",
};
export const versionPublishedPayloadSchema = z.object({
	strategyId: strategyIdSchema,
	strategyVersionId: strategyVersionIdSchema,
	organizationId: z.string().uuid(),
	versionNumber: z.number().int().positive(),
	sourceHash: z.string().min(32).max(128),
	rulesHash: z.string().min(32).max(128),
	parametersHash: z.string().min(32).max(128),
	executionMode: strategiesExecutionModeSchema,
});
export const strategiesEventPayloadSchema = z.discriminatedUnion("eventType", [
	z.object({
		eventType: z.literal(STRATEGIES_EVENT_TYPES.VERSION_PUBLISHED),
		payload: versionPublishedPayloadSchema,
	}),
]);

export type StrategiesEventType =
	(typeof STRATEGIES_EVENT_TYPES)[keyof typeof STRATEGIES_EVENT_TYPES];
