import { z } from "zod";
import {
	assetClassSchema,
	orderSideSchema,
	orderTypeSchema,
} from "../decisions/types";
import {
	adapterActorTypeSchema,
	adapterCapabilityKeySchema,
	adapterDispatchIdSchema,
	adapterGatewayExecutionModeSchema,
} from "./types";
export const adapterOrderParametersSchema = z.object({
	side: orderSideSchema,
	orderType: orderTypeSchema,
	quantity: z.string().regex(/^\d+(\.\d+)?$/),
	limitPrice: z
		.string()
		.regex(/^\d+(\.\d+)?$/)
		.optional(),
});
export const adapterCommandV1Schema = z.object({
	commandId: z.string().uuid(),
	idempotencyKey: z.string().min(1).max(128),
	tenantId: z.string().uuid(),
	agencyId: z.string().uuid(),
	actorId: z.string().uuid(),
	actorType: adapterActorTypeSchema,
	executionMode: adapterGatewayExecutionModeSchema,
	adapterId: z.string().min(1).max(64),
	adapterVersion: z.string().min(1).max(64),
	imageDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/i),
	assetClass: assetClassSchema,
	venueRef: z.string().min(1).max(128),
	accountRef: z.string().min(1).max(128),
	instrumentRef: z.string().min(1).max(128),
	tradeIntentId: z.string().uuid(),
	executionPermitId: z.string().uuid(),
	permitHash: z.string().min(1).max(256),
	order: adapterOrderParametersSchema,
	correlationId: z.string().uuid(),
	causationId: z.string().uuid(),
	createdAt: z.string().datetime(),
	expiresAt: z.string().datetime(),
	policyVersion: z.string().min(1).max(64),
	grantEpoch: z.number().int().nonnegative(),
	riskSnapshotId: z.string().min(1).max(128),
	budgetReservationId: z.string().uuid().optional(),
	requestedCapabilities: z.array(adapterCapabilityKeySchema).min(1),
});
export const adapterGatewayCommandResultSchema = z.object({
	aggregateId: z.string().min(1),
	revision: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
	dispatchId: adapterDispatchIdSchema.optional(),
	adapterEventId: z.string().uuid().optional(),
	outcome: z.enum(["ACCEPTED", "REJECTED"]).optional(),
});
/** Module command alias for dispatchAdapterCommand handler. */
export const dispatchAdapterCommandSchema = adapterCommandV1Schema;

export type AdapterCommandV1 = z.infer<typeof adapterCommandV1Schema>;

export type AdapterGatewayCommandResult = z.infer<
	typeof adapterGatewayCommandResultSchema
>;
/** Module command alias for dispatchAdapterCommand handler. */

export type DispatchAdapterCommand = AdapterCommandV1;
