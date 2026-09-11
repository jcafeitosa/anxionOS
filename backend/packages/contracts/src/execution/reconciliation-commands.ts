import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	executionReconciliationCaseIdSchema,
	executionReconciliationDispositionSchema,
} from "./reconciliation-types";

export const openVenueReconciliationCaseCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	caseKind: z.enum([
		"ORDER_STATUS_MISMATCH",
		"FILL_MISSING",
		"DUPLICATE_VENUE_FILL",
	]),
	orderId: z.string().min(1).optional(),
	fillId: z.string().min(1).optional(),
	venueAdapterRefId: z.string().min(1),
	venueFillId: z.string().min(1).optional(),
	evidence: z.string().min(1).max(2000).optional(),
});

export const resolveVenueReconciliationCaseCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	caseId: executionReconciliationCaseIdSchema,
	disposition: executionReconciliationDispositionSchema,
	rationale: z.string().min(1).max(2000),
});

export const reconcileUnknownDispatchCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	orderId: z.string().min(1),
	venueFillId: z.string().min(1).optional(),
	clientOrderId: z.string().min(1).optional(),
	decision: z.enum(["CONFIRM_EXISTING", "MARK_FAILED", "KEEP_RECONCILING"]),
	rationale: z.string().min(1).max(2000),
});

export type OpenVenueReconciliationCaseCommand = z.infer<
	typeof openVenueReconciliationCaseCommandSchema
>;
export type ResolveVenueReconciliationCaseCommand = z.infer<
	typeof resolveVenueReconciliationCaseCommandSchema
>;
export type ReconcileUnknownDispatchCommand = z.infer<
	typeof reconcileUnknownDispatchCommandSchema
>;
