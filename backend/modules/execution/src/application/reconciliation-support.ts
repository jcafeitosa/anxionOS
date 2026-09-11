import { randomUUID } from "node:crypto";
import type { ExecutionReconciliationCaseKind } from "@anxionos/contracts/execution";
import {
	createReconciliationOpenedEvent,
	createReconciliationResolvedEvent,
} from "../domain/events/execution-events";
import type {
	ExecutionReconciliationCaseRecord,
	ExecutionTransactionContext,
	ExecutionUnitOfWork,
} from "../domain/ports/execution-unit-of-work";
import { throwExecutionError } from "./errors";

export async function openVenueReconciliationCaseInTransaction(
	ctx: ExecutionTransactionContext,
	input: {
		organizationId: string;
		caseKind: ExecutionReconciliationCaseKind;
		orderId?: string;
		fillId?: string;
		venueAdapterRefId: string;
		venueFillId?: string;
		evidence?: string;
	},
): Promise<ExecutionReconciliationCaseRecord> {
	if (input.venueFillId) {
		const existing = await ctx.reconciliationCases.findOpenByVenueFillId(
			input.organizationId,
			input.venueFillId,
		);
		if (existing) return existing;
	}

	const caseId = `ex_rc_${randomUUID()}`;
	const openedAt = new Date().toISOString();
	const eventId = randomUUID();
	const record: ExecutionReconciliationCaseRecord = {
		id: caseId,
		organizationId: input.organizationId,
		caseKind: input.caseKind,
		status: "OPEN",
		orderId: input.orderId ?? null,
		fillId: input.fillId ?? null,
		venueAdapterRefId: input.venueAdapterRefId,
		venueFillId: input.venueFillId ?? null,
		evidence: input.evidence ?? null,
		openedAt,
	};

	await ctx.reconciliationCases.save(record);
	await ctx.publishEvents([
		createReconciliationOpenedEvent({
			eventId,
			organizationId: input.organizationId,
			caseId,
			caseKind: input.caseKind,
			orderId: input.orderId,
			fillId: input.fillId,
			venueAdapterRefId: input.venueAdapterRefId,
			venueFillId: input.venueFillId,
			evidence: input.evidence,
		}),
	]);

	return record;
}

export async function resolveVenueReconciliationCaseInTransaction(
	ctx: ExecutionTransactionContext,
	input: {
		case: ExecutionReconciliationCaseRecord;
		disposition: string;
		rationale: string;
	},
): Promise<ExecutionReconciliationCaseRecord> {
	if (input.case.status === "RESOLVED" || input.case.status === "ESCALATED") {
		throwExecutionError(
			"EX_RECONCILIATION_NOT_OPEN",
			"reconciliation case is not open",
		);
	}

	const resolvedAt = new Date().toISOString();
	const updated: ExecutionReconciliationCaseRecord = {
		...input.case,
		status: "RESOLVED",
		disposition: input.disposition,
		dispositionRationale: input.rationale,
		resolvedAt,
	};

	await ctx.reconciliationCases.update(updated);
	await ctx.publishEvents([
		createReconciliationResolvedEvent({
			eventId: randomUUID(),
			organizationId: input.case.organizationId,
			caseId: input.case.id,
			caseKind: input.case.caseKind,
			orderId: input.case.orderId ?? undefined,
			fillId: input.case.fillId ?? undefined,
			disposition: input.disposition,
			rationale: input.rationale,
			resolvedAt,
		}),
	]);

	return updated;
}

export async function handleDuplicateVenueFillInTransaction(
	ctx: ExecutionTransactionContext,
	input: {
		organizationId: string;
		orderId: string;
		existingFillId: string;
		venueFillId: string;
		venueAdapterRefId: string;
	},
): Promise<ExecutionReconciliationCaseRecord> {
	const reconciliationCase = await openVenueReconciliationCaseInTransaction(
		ctx,
		{
			organizationId: input.organizationId,
			caseKind: "DUPLICATE_VENUE_FILL",
			orderId: input.orderId,
			fillId: input.existingFillId,
			venueAdapterRefId: input.venueAdapterRefId,
			venueFillId: input.venueFillId,
			evidence: `duplicate venue fill id ${input.venueFillId}`,
		},
	);

	return resolveVenueReconciliationCaseInTransaction(ctx, {
		case: reconciliationCase,
		disposition: "LINKED_EXISTING_FILL",
		rationale: `linked to existing fill ${input.existingFillId}`,
	});
}

/** Persists audited disposition in its own transaction so rollback of the fill attempt does not drop the case. */
export async function handleDuplicateVenueFill(
	unitOfWork: ExecutionUnitOfWork,
	input: {
		organizationId: string;
		orderId: string;
		existingFillId: string;
		venueFillId: string;
		venueAdapterRefId: string;
	},
): Promise<ExecutionReconciliationCaseRecord> {
	return unitOfWork.runInTransaction((ctx) =>
		handleDuplicateVenueFillInTransaction(ctx, input),
	);
}

export function assertNoBlindRetryOnUnknownDispatch(
	venueDispatchStatus: string | null | undefined,
): void {
	if (
		venueDispatchStatus === "UNKNOWN" ||
		venueDispatchStatus === "RECONCILING"
	) {
		throwExecutionError(
			"EX_BLIND_RETRY_FORBIDDEN",
			"reconcile before retry when dispatch state is UNKNOWN/RECONCILING",
		);
	}
}
