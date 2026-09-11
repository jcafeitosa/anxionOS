import type {
	ReleaseKillSwitchCommand,
	RiskCommandResult,
} from "@anxionos/contracts/risk";
import {
	releaseKillSwitchCommandSchema,
	riskCommandResultSchema,
} from "@anxionos/contracts/risk";
import { createKillSwitchReleasedEvent } from "../../domain/events/risk-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { RiskUnitOfWork } from "../../domain/ports/risk-unit-of-work";
import {
	loadIdempotentCommandResultWithGuard,
	replayIdempotentCommandJournalEntry,
	toCommandResultSnapshot,
} from "../command-support";
import { throwRiskError } from "../errors";

export interface ReleaseKillSwitchDeps {
	unitOfWork: RiskUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function releaseKillSwitch(
	deps: ReleaseKillSwitchDeps,
	input: ReleaseKillSwitchCommand,
): Promise<RiskCommandResult> {
	const command = releaseKillSwitchCommandSchema.parse(input);
	if (command.scope === "PORTFOLIO" && !command.portfolioId) {
		throwRiskError(
			"RK_CONFIG_REQUIRED",
			"portfolioId required for PORTFOLIO kill switch scope",
		);
	}
	const replay = await loadIdempotentCommandResultWithGuard(
		deps.commandJournal,
		command.commandId,
		command.organizationId,
	);
	if (replay) return replay;
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const raced = await ctx.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			return replayIdempotentCommandJournalEntry(raced, command.organizationId);
		}
		const released = await ctx.killSwitch.deactivate({
			organizationId: command.organizationId,
			scope: command.scope,
			portfolioId: command.portfolioId ?? null,
		});
		if (!released) {
			throwRiskError(
				"RK_KILL_SWITCH_NOT_ACTIVE",
				"no active kill switch for scope",
			);
		}
		const epoch = await ctx.epochRegistry.findByOrganization(
			command.organizationId,
		);
		const currentRiskEpoch =
			epoch?.currentRiskEpoch ?? released.riskEpochAtActivation;
		await ctx.publishEvents([
			createKillSwitchReleasedEvent({
				killSwitchId: released.id,
				organizationId: command.organizationId,
				scope: command.scope,
				portfolioId: command.portfolioId,
				releasedBy: command.releasedBy,
				riskEpoch: currentRiskEpoch,
			}),
		]);
		const result = riskCommandResultSchema.parse({
			aggregateId: released.id,
			revision: 2,
			killSwitchId: released.id,
			riskEpoch: currentRiskEpoch,
			killSwitchActive: false,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "releaseKillSwitch",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
