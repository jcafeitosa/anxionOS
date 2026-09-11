import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	executionDecimalAmountSchema,
	executionModuleModeSchema,
	executionOrderSideSchema,
} from "./module-types";
import {
	executionReconciliationCaseKindSchema,
	executionReconciliationDispositionSchema,
} from "./reconciliation-types";
export const EXECUTION_MODULE_EVENT_TYPES = {
	SESSION_OPENED: "execution.session.opened.v1",
	ORDER_SUBMITTED: "execution.order.submitted.v1",
	ORDER_CANCELLED: "execution.order.cancelled.v1",
	FILL_CONFIRMED: "execution.fill.confirmed.v1",
	RECONCILIATION_OPENED: "execution.reconciliation.opened.v1",
	RECONCILIATION_RESOLVED: "execution.reconciliation.resolved.v1",
};
export const sessionOpenedPayloadSchema = z.object({
	sessionId: z.string().min(1),
	organizationId: institutionalUuidSchema,
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
	organizationId: institutionalUuidSchema,
	clientOrderId: z.string().min(1),
	instrumentId: z.string().min(1),
	side: executionOrderSideSchema,
	quantity: executionDecimalAmountSchema,
	price: executionDecimalAmountSchema,
	executionMode: executionModuleModeSchema,
});
/** Payload fields aligned with executionFillConfirmedV1Schema (accounting bridge). */
export const orderCancelledPayloadSchema = z.object({
	eventId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	orderId: z.string().min(1),
	sessionId: z.string().min(1),
	clientOrderId: z.string().min(1),
	cancelledAt: z.string().datetime(),
	executionMode: executionModuleModeSchema,
	filledQuantity: executionDecimalAmountSchema,
	remainingQuantity: executionDecimalAmountSchema,
	capitalAccountId: z.string().optional(),
	portfolioId: institutionalUuidSchema.optional(),
	reservationId: z.string().optional(),
});
export const reconciliationOpenedPayloadSchema = z.object({
	eventId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	caseId: z.string().min(1),
	caseKind: executionReconciliationCaseKindSchema,
	orderId: z.string().min(1).optional(),
	fillId: z.string().min(1).optional(),
	venueAdapterRefId: z.string().min(1),
	venueFillId: z.string().min(1).optional(),
	evidence: z.string().optional(),
});
export const reconciliationResolvedPayloadSchema = z.object({
	eventId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	caseId: z.string().min(1),
	caseKind: executionReconciliationCaseKindSchema,
	orderId: z.string().min(1).optional(),
	fillId: z.string().min(1).optional(),
	disposition: executionReconciliationDispositionSchema,
	rationale: z.string().min(1),
	resolvedAt: z.string().datetime(),
});
export const fillConfirmedPayloadSchema = z.object({
	eventId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
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
	portfolioId: institutionalUuidSchema.optional(),
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
			eventType: z.literal(EXECUTION_MODULE_EVENT_TYPES.ORDER_CANCELLED),
			payload: orderCancelledPayloadSchema,
		}),
		z.object({
			eventType: z.literal(EXECUTION_MODULE_EVENT_TYPES.FILL_CONFIRMED),
			payload: fillConfirmedPayloadSchema,
		}),
		z.object({
			eventType: z.literal(EXECUTION_MODULE_EVENT_TYPES.RECONCILIATION_OPENED),
			payload: reconciliationOpenedPayloadSchema,
		}),
		z.object({
			eventType: z.literal(
				EXECUTION_MODULE_EVENT_TYPES.RECONCILIATION_RESOLVED,
			),
			payload: reconciliationResolvedPayloadSchema,
		}),
	],
);

export type ExecutionModuleEventType =
	(typeof EXECUTION_MODULE_EVENT_TYPES)[keyof typeof EXECUTION_MODULE_EVENT_TYPES];
