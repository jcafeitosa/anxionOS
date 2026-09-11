import type {
	ExecutionOrderSnapshot,
	ExecutionReconciliationCaseSnapshot,
} from "@anxionos/contracts/execution";
import {
	executionOrderSnapshotSchema,
	executionReconciliationCaseSnapshotSchema,
} from "@anxionos/contracts/execution";
import type {
	ExecutionOrderListRow,
	ExecutionReconciliationCaseRecord,
} from "../../domain/ports/execution-unit-of-work";

export function toOrderSnapshot(
	record: ExecutionOrderListRow,
): ExecutionOrderSnapshot {
	return executionOrderSnapshotSchema.parse({
		orderId: record.id,
		organizationId: record.organizationId,
		sessionId: record.sessionId,
		clientOrderId: record.clientOrderId,
		instrumentId: record.instrumentId,
		side: record.side,
		quantity: record.quantity,
		price: record.price,
		status: record.status,
		executionMode: record.executionMode,
		submittedAt: record.submittedAt,
	});
}

export function toReconciliationCaseSnapshot(
	record: ExecutionReconciliationCaseRecord,
): ExecutionReconciliationCaseSnapshot {
	return executionReconciliationCaseSnapshotSchema.parse({
		reconciliationCaseId: record.id,
		organizationId: record.organizationId,
		caseKind: record.caseKind,
		status: record.status,
		orderId: record.orderId ?? null,
		fillId: record.fillId ?? null,
		venueAdapterRefId: record.venueAdapterRefId,
		venueFillId: record.venueFillId ?? null,
		evidence: record.evidence ?? null,
		disposition: record.disposition ?? null,
		dispositionRationale: record.dispositionRationale ?? null,
		openedAt: record.openedAt,
		resolvedAt: record.resolvedAt ?? null,
	});
}
