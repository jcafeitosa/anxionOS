import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import { riskPermitIdSchema } from "../risk/types";
import {
	executionDecimalAmountSchema,
	executionModuleModeSchema,
	executionOrderSideSchema,
	executionSessionIdSchema,
} from "./module-types";
export const executionCommandResultSchema = z.object({
	aggregateId: z.string().min(1),
	revision: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
	sessionId: executionSessionIdSchema.optional(),
	orderId: z.string().optional(),
	fillId: z.string().optional(),
	venueFillId: z.string().optional(),
	orderStatus: z.string().optional(),
	remainingQuantity: z.string().optional(),
	reconciliationCaseId: z.string().optional(),
	venueDispatchStatus: z.string().optional(),
	disposition: z.string().optional(),
});
export const openExecutionSessionCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	intentHash: z.string().min(1),
	riskPermitId: riskPermitIdSchema,
	authorityEpoch: z.number().int().nonnegative(),
	riskEpoch: z.number().int().nonnegative(),
	executionMode: executionModuleModeSchema,
});
export const submitOrderCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	sessionId: executionSessionIdSchema,
	clientOrderId: z.string().min(1).max(128),
	instrumentId: z.string().min(1),
	side: executionOrderSideSchema,
	quantity: executionDecimalAmountSchema,
	price: executionDecimalAmountSchema,
	asset: z.string().min(1).max(16).default("USD"),
	capitalAccountId: z.string().optional(),
	portfolioId: institutionalUuidSchema.optional(),
	/** When omitted, equals quantity (immediate full fill). Set lower for partial fills. */
	fillQuantity: executionDecimalAmountSchema.optional(),
	/** When true, order stays SUBMITTED without venue fill (race/cancel scenarios). */
	deferFill: z.boolean().optional(),
	/** When true, simulates venue dispatch timeout (UNKNOWN until reconcile). */
	simulateDispatchTimeout: z.boolean().optional(),
});
export const cancelOrderCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	orderId: z.string().min(1),
	capitalAccountId: z.string().optional(),
	portfolioId: institutionalUuidSchema.optional(),
	reservationId: z.string().optional(),
});
export const recordFillCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	orderId: z.string().min(1),
	fillQuantity: executionDecimalAmountSchema,
	price: executionDecimalAmountSchema.optional(),
	asset: z.string().min(1).max(16).optional(),
	capitalAccountId: z.string().optional(),
	portfolioId: institutionalUuidSchema.optional(),
});

export type ExecutionCommandResult = z.infer<
	typeof executionCommandResultSchema
>;

export type OpenExecutionSessionCommand = z.infer<
	typeof openExecutionSessionCommandSchema
>;

export type SubmitOrderCommand = z.infer<typeof submitOrderCommandSchema>;

export type CancelOrderCommand = z.infer<typeof cancelOrderCommandSchema>;

export type RecordFillCommand = z.infer<typeof recordFillCommandSchema>;
