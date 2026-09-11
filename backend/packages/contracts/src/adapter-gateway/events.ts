import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	adapterGatewayEnvironmentSchema,
	adapterGatewayExecutionModeSchema,
} from "./types";
export const ADAPTER_EVENT_OUTCOMES = [
	"ACCEPTED",
	"REJECTED",
	"PARTIAL",
	"FILLED",
	"CANCELED",
	"FAILED",
	"UNKNOWN",
	"RECONCILED",
] as const;
export const adapterEventOutcomeSchema = z.enum(ADAPTER_EVENT_OUTCOMES);
export const ADAPTER_GATEWAY_EVENT_TYPES = {
	COMMAND_DISPATCHED: "adapter-gateway.command.dispatched.v1",
	ADAPTER_EVENT_INGESTED: "adapter-gateway.adapter-event.ingested.v1",
};
export const adapterEventV1Schema = z.object({
	eventId: institutionalUuidSchema,
	eventType: z.string().min(1),
	eventVersion: z.literal("v1"),
	sequence: z.number().int().nonnegative(),
	checkpoint: z.string().min(1),
	commandId: institutionalUuidSchema,
	correlationId: institutionalUuidSchema,
	causationId: institutionalUuidSchema,
	adapterId: z.string().min(1).max(64),
	adapterVersion: z.string().min(1).max(64),
	imageDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/i),
	environment: adapterGatewayEnvironmentSchema,
	engineTimestamp: z.string().datetime(),
	ingestionTimestamp: z.string().datetime(),
	outcome: adapterEventOutcomeSchema,
	errorCode: z.string().optional(),
	errorMessage: z.string().optional(),
	payload: z.record(z.string(), z.unknown()).default(() => ({})),
	sourceRef: z.string().optional(),
});
export const commandDispatchedPayloadSchema = z.object({
	dispatchId: z.string().regex(/^agw_dsp_[0-9a-f-]{36}$/i),
	tenantId: institutionalUuidSchema,
	commandId: institutionalUuidSchema,
	idempotencyKey: z.string().min(1),
	adapterId: z.string().min(1),
	adapterVersion: z.string().min(1),
	executionMode: adapterGatewayExecutionModeSchema,
	executionPermitId: institutionalUuidSchema,
	correlationId: institutionalUuidSchema,
	dispatchedAt: z.string().datetime(),
});
export const adapterEventIngestedPayloadSchema = z.object({
	dispatchId: z.string().regex(/^agw_dsp_[0-9a-f-]{36}$/i),
	tenantId: institutionalUuidSchema,
	adapterEvent: adapterEventV1Schema,
});
export const adapterGatewayEventPayloadSchema = z.discriminatedUnion(
	"eventType",
	[
		z.object({
			eventType: z.literal(ADAPTER_GATEWAY_EVENT_TYPES.COMMAND_DISPATCHED),
			payload: commandDispatchedPayloadSchema,
		}),
		z.object({
			eventType: z.literal(ADAPTER_GATEWAY_EVENT_TYPES.ADAPTER_EVENT_INGESTED),
			payload: adapterEventIngestedPayloadSchema,
		}),
	],
);

export type AdapterGatewayEventType =
	(typeof ADAPTER_GATEWAY_EVENT_TYPES)[keyof typeof ADAPTER_GATEWAY_EVENT_TYPES];

export type AdapterEventV1 = z.infer<typeof adapterEventV1Schema>;
