import { randomUUID } from "node:crypto";
import type { PositionReconciliationCaseKind } from "@anxionos/contracts/portfolios";
import {
	createReconciliationOpenedEvent,
	createReconciliationResolvedEvent,
} from "../domain/events/portfolios-events";
import type {
	PortfoliosTransactionContext,
	PositionReconciliationCaseRecord,
} from "../domain/ports/portfolios-unit-of-work";
import { throwPortfoliosError } from "./errors";

export async function openPositionReconciliationCaseInTransaction(
	ctx: PortfoliosTransactionContext,
	input: {
		organizationId: string;
		portfolioId: string;
		caseKind: PositionReconciliationCaseKind;
		positionId?: string;
		fillId?: string;
		journalEntryId?: string;
		evidence?: string;
	},
): Promise<PositionReconciliationCaseRecord> {
	if (input.fillId) {
		const existing = await ctx.reconciliationCases.findOpenByFillId(
			input.organizationId,
			input.fillId,
			input.caseKind,
		);
		if (existing) return existing;
	}

	const caseId = `pf_rc_${randomUUID()}`;
	const openedAt = new Date().toISOString();
	const record: PositionReconciliationCaseRecord = {
		id: caseId,
		organizationId: input.organizationId,
		portfolioId: input.portfolioId,
		positionId: input.positionId ?? null,
		caseKind: input.caseKind,
		status: "OPEN",
		fillId: input.fillId ?? null,
		journalEntryId: input.journalEntryId ?? null,
		evidence: input.evidence ?? null,
		disposition: null,
		dispositionRationale: null,
		openedAt,
		resolvedAt: null,
	};

	await ctx.reconciliationCases.save(record);
	await ctx.publishEvents([
		createReconciliationOpenedEvent({
			caseId,
			organizationId: input.organizationId,
			portfolioId: input.portfolioId,
			caseKind: input.caseKind,
			positionId: input.positionId,
			fillId: input.fillId,
			journalEntryId: input.journalEntryId,
			evidence: input.evidence,
		}),
	]);

	return record;
}

export async function resolvePositionReconciliationCaseInTransaction(
	ctx: PortfoliosTransactionContext,
	input: {
		case: PositionReconciliationCaseRecord;
		disposition: string;
		rationale: string;
	},
): Promise<PositionReconciliationCaseRecord> {
	if (input.case.status === "RESOLVED" || input.case.status === "ESCALATED") {
		throwPortfoliosError(
			"PF_RECONCILIATION_NOT_OPEN",
			"reconciliation case is not open",
		);
	}

	const resolvedAt = new Date().toISOString();
	const updated: PositionReconciliationCaseRecord = {
		...input.case,
		status: "RESOLVED",
		disposition: input.disposition,
		dispositionRationale: input.rationale,
		resolvedAt,
	};

	await ctx.reconciliationCases.update(updated);
	await ctx.publishEvents([
		createReconciliationResolvedEvent({
			caseId: input.case.id,
			organizationId: input.case.organizationId,
			portfolioId: input.case.portfolioId,
			caseKind: input.case.caseKind,
			disposition: input.disposition,
			rationale: input.rationale,
		}),
	]);

	return updated;
}
