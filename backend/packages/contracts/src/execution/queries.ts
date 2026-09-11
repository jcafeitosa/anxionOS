import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	executionModuleModeSchema,
	executionOrderIdSchema,
	executionOrderSideSchema,
	executionOrderStatusSchema,
	executionDecimalAmountSchema,
} from "./module-types";
import {
	executionReconciliationCaseIdSchema,
	executionReconciliationCaseKindSchema,
	executionReconciliationCaseStatusSchema,
	executionReconciliationDispositionSchema,
} from "./reconciliation-types";

export const executionOrderSnapshotSchema = z.object({
	orderId: executionOrderIdSchema,
	organizationId: institutionalUuidSchema,
	sessionId: z.string().regex(/^ex_ses_[0-9a-f-]{36}$/i),
	clientOrderId: z.string().min(1).max(128),
	instrumentId: z.string().min(1).max(128),
	side: executionOrderSideSchema,
	quantity: executionDecimalAmountSchema,
	price: executionDecimalAmountSchema,
	status: executionOrderStatusSchema,
	executionMode: executionModuleModeSchema,
	submittedAt: z.string().datetime(),
	revision: z.number().int().positive().optional(),
});

export const listOrdersResponseSchema = z.object({
	orders: z.array(executionOrderSnapshotSchema),
});

export const executionReconciliationCaseSnapshotSchema = z.object({
	reconciliationCaseId: executionReconciliationCaseIdSchema,
	organizationId: institutionalUuidSchema,
	caseKind: executionReconciliationCaseKindSchema,
	status: executionReconciliationCaseStatusSchema,
	orderId: executionOrderIdSchema.nullable().optional(),
	fillId: z
		.string()
		.regex(/^ex_fill_[0-9a-f-]{36}$/i)
		.nullable()
		.optional(),
	venueAdapterRefId: z.string().min(1).max(128),
	venueFillId: z.string().min(1).max(256).nullable().optional(),
	evidence: z.string().max(4096).nullable().optional(),
	disposition: executionReconciliationDispositionSchema.nullable().optional(),
	dispositionRationale: z.string().max(1024).nullable().optional(),
	openedAt: z.string().datetime(),
	resolvedAt: z.string().datetime().nullable().optional(),
});

export const listReconciliationCasesResponseSchema = z.object({
	reconciliationCases: z.array(executionReconciliationCaseSnapshotSchema),
});

export type ExecutionOrderSnapshot = z.infer<typeof executionOrderSnapshotSchema>;
export type ListOrdersResponse = z.infer<typeof listOrdersResponseSchema>;
export type ExecutionReconciliationCaseSnapshot = z.infer<
	typeof executionReconciliationCaseSnapshotSchema
>;
export type ListReconciliationCasesResponse = z.infer<
	typeof listReconciliationCasesResponseSchema
>;
