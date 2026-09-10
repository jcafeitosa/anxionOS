import { randomUUID } from "node:crypto";
import type {
	ActivateLimitPolicyCommand,
	RiskCommandResult,
} from "@anxionos/contracts/risk";
import {
	activateLimitPolicyCommandSchema,
	riskCommandResultSchema,
} from "@anxionos/contracts/risk";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { RiskUnitOfWork } from "../../domain/ports/risk-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwRiskError } from "../errors";

export interface ActivateLimitPolicyDeps {
	unitOfWork: RiskUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function activateLimitPolicy(
	deps: ActivateLimitPolicyDeps,
	input: ActivateLimitPolicyCommand,
): Promise<RiskCommandResult> {
	const command = activateLimitPolicyCommandSchema.parse(input);
	const existingCommand = await deps.commandJournal.findByCommandId(
		command.commandId,
	);
	if (
		existingCommand &&
		existingCommand.organizationId !== command.organizationId
	) {
		throwRiskError("RK_CROSS_TENANT", "command journal organization mismatch");
	}
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
	);
	if (replay) return replay;
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const raced = await ctx.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			const parsed = parseCommandResultSnapshot(raced.responseSnapshot);
			return riskCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
		}
		await ctx.limitPolicies.supersedeActive(command.organizationId);
		const policyId = `rk_pol_${randomUUID()}`;
		const saved = await ctx.limitPolicies.save({
			id: policyId,
			organizationId: command.organizationId,
			policyVersion: command.policyVersion,
			maxNotional: command.maxNotional,
			maxLeverage: command.maxLeverage ?? null,
			riskEpoch: command.riskEpoch,
			status: "ACTIVE",
		});
		await ctx.epochRegistry.upsert({
			organizationId: command.organizationId,
			currentRiskEpoch: command.riskEpoch,
		});
		const result = riskCommandResultSchema.parse({
			aggregateId: saved.id,
			revision: 1,
			policyId: saved.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "activateLimitPolicy",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
