import { z } from "zod";
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
});
export const openExecutionSessionCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	intentHash: z.string().min(1),
	riskPermitId: riskPermitIdSchema,
	authorityEpoch: z.number().int().nonnegative(),
	riskEpoch: z.number().int().nonnegative(),
	executionMode: executionModuleModeSchema,
});
export const submitOrderCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	sessionId: executionSessionIdSchema,
	clientOrderId: z.string().min(1).max(128),
	instrumentId: z.string().min(1),
	side: executionOrderSideSchema,
	quantity: executionDecimalAmountSchema,
	price: executionDecimalAmountSchema,
	asset: z.string().min(1).max(16).default("USD"),
	capitalAccountId: z.string().optional(),
	portfolioId: z.string().uuid().optional(),
});

export type ExecutionCommandResult = z.infer<
	typeof executionCommandResultSchema
>;

export type OpenExecutionSessionCommand = z.infer<
	typeof openExecutionSessionCommandSchema
>;

export type SubmitOrderCommand = z.infer<typeof submitOrderCommandSchema>;
