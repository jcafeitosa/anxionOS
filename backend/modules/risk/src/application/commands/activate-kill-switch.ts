import { randomUUID } from "node:crypto";
import type {
	ActivateKillSwitchCommand,
	RiskCommandResult,
} from "@anxionos/contracts/risk";
import {
	activateKillSwitchCommandSchema,
	riskCommandResultSchema,
} from "@anxionos/contracts/risk";
import {
	createKillSwitchActivatedEvent,
	createRiskEpochBumpedEvent,
} from "../../domain/events/risk-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { RiskUnitOfWork } from "../../domain/ports/risk-unit-of-work";
import {
	loadIdempotentCommandResultWithGuard,
	replayIdempotentCommandJournalEntry,
	toCommandResultSnapshot,
} from "../command-support";
import { throwRiskError } from "../errors";

export interface ActivateKillSwitchDeps {
	unitOfWork: RiskUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function activateKillSwitch(
	deps: ActivateKillSwitchDeps,
	input: ActivateKillSwitchCommand,
): Promise<RiskCommandResult> {
	const command = activateKillSwitchCommandSchema.parse(input);
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
			return replayIdempotentCommandJournalEntry(
				raced,
				command.organizationId,
			);
		}
		const epoch = await ctx.epochRegistry.findByOrganization(
			command.organizationId,
		);
		const previousRiskEpoch = epoch?.currentRiskEpoch ?? 0;
		const currentRiskEpoch = previousRiskEpoch + 1;
		await ctx.epochRegistry.upsert({
			organizationId: command.organizationId,
			currentRiskEpoch,
		});
		await ctx.killSwitch.deactivate({
			organizationId: command.organizationId,
			scope: command.scope,
			portfolioId: command.portfolioId ?? null,
		});
		const killSwitchId = `rk_ksw_${randomUUID()}`;
		const saved = await ctx.killSwitch.save({
			id: killSwitchId,
			organizationId: command.organizationId,
			scope: command.scope,
			portfolioId: command.portfolioId ?? null,
			reason: command.reason,
			activatedBy: command.activatedBy,
			riskEpochAtActivation: currentRiskEpoch,
			active: true,
		});
		const events = [
			createRiskEpochBumpedEvent({
				organizationId: command.organizationId,
				previousRiskEpoch,
				currentRiskEpoch,
				reason: "ActivateKillSwitch",
			}),
			createKillSwitchActivatedEvent({
				killSwitchId: saved.id,
				organizationId: command.organizationId,
				scope: command.scope,
				portfolioId: command.portfolioId,
				reason: command.reason,
				activatedBy: command.activatedBy,
				riskEpoch: currentRiskEpoch,
			}),
		];
		await ctx.publishEvents(events);
		const result = riskCommandResultSchema.parse({
			aggregateId: saved.id,
			revision: 1,
			killSwitchId: saved.id,
			riskEpoch: currentRiskEpoch,
			killSwitchActive: true,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "activateKillSwitch",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
