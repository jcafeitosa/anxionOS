import type { RiskCommandResult } from "@anxionos/contracts/risk";
import { riskCommandResultSchema } from "@anxionos/contracts/risk";
import type {
	CommandJournalEntry,
	CommandJournalRepository,
} from "../domain/ports/command-journal";
import { parseCommandResultSnapshot, throwRiskError } from "./errors";

export async function loadIdempotentCommandResult(
	commandJournal: CommandJournalRepository,
	commandId: string,
): Promise<RiskCommandResult | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing) return null;
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export async function loadIdempotentCommandResultWithGuard(
	commandJournal: CommandJournalRepository,
	commandId: string,
	organizationId: string,
): Promise<RiskCommandResult | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing) return null;
	if (existing.organizationId !== organizationId) {
		throwRiskError("RK_CROSS_TENANT", "command journal organization mismatch");
	}
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export function replayIdempotentCommandJournalEntry(
	existing: CommandJournalEntry,
	organizationId: string,
): RiskCommandResult {
	if (existing.organizationId !== organizationId) {
		throwRiskError("RK_CROSS_TENANT", "command journal organization mismatch");
	}
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return riskCommandResultSchema.parse({
		...parsed,
		idempotentReplay: true,
	});
}

export async function loadIdempotentByIntentHash(
	commandJournal: CommandJournalRepository,
	organizationId: string,
	intentHash: string,
): Promise<RiskCommandResult | null> {
	const existing = await commandJournal.findByIntentHash(
		organizationId,
		intentHash,
	);
	if (!existing) return null;
	const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
	return { ...parsed, idempotentReplay: true };
}

export function toCommandResultSnapshot(
	result: RiskCommandResult,
): Record<string, unknown> {
	return {
		aggregateId: result.aggregateId,
		revision: result.revision,
		idempotentReplay: result.idempotentReplay ?? false,
		policyId: result.policyId,
		checkId: result.checkId,
		permitId: result.permitId,
		checkResult: result.checkResult,
		denyReasonCode: result.denyReasonCode,
		killSwitchId: result.killSwitchId,
		riskEpoch: result.riskEpoch,
		killSwitchActive: result.killSwitchActive,
	};
}

export function compareDecimalAmounts(left: string, right: string): number {
	const a = Number.parseFloat(left);
	const b = Number.parseFloat(right);
	if (a > b) return 1;
	if (a < b) return -1;
	return 0;
}
