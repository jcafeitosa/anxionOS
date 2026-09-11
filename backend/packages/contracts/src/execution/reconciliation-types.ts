import { z } from "zod";

export const executionReconciliationCaseIdSchema = z
	.string()
	.regex(/^ex_rc_[0-9a-f-]{36}$/i);

export const executionReconciliationCaseKindSchema = z.enum([
	"ORDER_STATUS_MISMATCH",
	"FILL_MISSING",
	"DUPLICATE_VENUE_FILL",
]);

export const executionReconciliationCaseStatusSchema = z.enum([
	"OPEN",
	"INVESTIGATING",
	"RESOLVED",
	"ESCALATED",
]);

export const executionVenueDispatchStatusSchema = z.enum([
	"DISPATCHED",
	"ACK",
	"UNKNOWN",
	"RECONCILING",
	"FAILED",
]);

export const executionOrderAttemptStatusSchema = z.enum([
	"SENT",
	"ACK",
	"REJECT",
	"TIMEOUT",
]);

export const executionReconciliationDispositionSchema = z.enum([
	"LINKED_EXISTING_FILL",
	"IGNORED_DUPLICATE",
	"CONFIRMED_EXISTING",
	"MARKED_FAILED",
	"STATUS_ALIGNED",
	"FILL_RECORDED",
]);

export type ExecutionReconciliationCaseKind = z.infer<
	typeof executionReconciliationCaseKindSchema
>;
export type ExecutionReconciliationCaseStatus = z.infer<
	typeof executionReconciliationCaseStatusSchema
>;
export type ExecutionVenueDispatchStatus = z.infer<
	typeof executionVenueDispatchStatusSchema
>;
export type ExecutionOrderAttemptStatus = z.infer<
	typeof executionOrderAttemptStatusSchema
>;
export type ExecutionReconciliationDisposition = z.infer<
	typeof executionReconciliationDispositionSchema
>;
