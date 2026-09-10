import { z } from "zod";
import {
	executionDecimalAmountSchema,
	executionModuleModeSchema,
	executionOrderSideSchema,
} from "./module-types";
export const EXECUTION_MODULE_EVENT_TYPES = {
	SESSION_OPENED: "execution.session.opened.v1",
	ORDER_SUBMITTED: "execution.order.submitted.v1",
	FILL_CONFIRMED: "execution.fill.confirmed.v1",
};
export const sessionOpenedPayloadSchema = z.object({
	sessionId: z.string().min(1),
	organizationId: z.string().uuid(),
	intentHash: z.string().min(1),
	riskPermitId: z.string().min(1),
	authorityEpoch: z.number().int().nonnegative(),
	riskEpoch: z.number().int().nonnegative(),
	executionMode: executionModuleModeSchema,
	venueAdapterRefId: z.string().min(1),
});
export const orderSubmittedPayloadSchema = z.object({
	orderId: z.string().min(1),
	sessionId: z.string().min(1),
	organizationId: z.string().uuid(),
	clientOrderId: z.string().min(1),
	instrumentId: z.string().min(1),
	side: executionOrderSideSchema,
	quantity: executionDecimalAmountSchema,
	price: executionDecimalAmountSchema,
	executionMode: executionModuleModeSchema,
});
/** Payload fields aligned with executionFillConfirmedV1Schema (accounting bridge). */
export const fillConfirmedPayloadSchema = z.object({
	eventId: z.string().uuid(),
	organizationId: z.string().uuid(),
	fillId: z.string().min(1).max(128),
	orderId: z.string().min(1),
	side: executionOrderSideSchema,
	instrumentId: z.string().min(1),
	quantity: executionDecimalAmountSchema,
	price: executionDecimalAmountSchema,
	notionalAmount: executionDecimalAmountSchema,
	asset: z.string().min(1).max(16),
	filledAt: z.string().datetime(),
	executionMode: executionModuleModeSchema,
	capitalAccountId: z.string().optional(),
	portfolioId: z.string().uuid().optional(),
});
export const executionModuleEventPayloadSchema = z.discriminatedUnion(
	"eventType",
	[
		z.object({
			eventType: z.literal(EXECUTION_MODULE_EVENT_TYPES.SESSION_OPENED),
			payload: sessionOpenedPayloadSchema,
		}),
		z.object({
			eventType: z.literal(EXECUTION_MODULE_EVENT_TYPES.ORDER_SUBMITTED),
			payload: orderSubmittedPayloadSchema,
		}),
		z.object({
			eventType: z.literal(EXECUTION_MODULE_EVENT_TYPES.FILL_CONFIRMED),
			payload: fillConfirmedPayloadSchema,
		}),
	],
);

export type ExecutionModuleEventType =
	(typeof EXECUTION_MODULE_EVENT_TYPES)[keyof typeof EXECUTION_MODULE_EVENT_TYPES];
