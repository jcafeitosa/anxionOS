import { randomUUID } from "node:crypto";
import type {
	RiskCommandResult,
	RunPreTradeCheckCommand,
} from "@anxionos/contracts/risk";
import {
	assertRiskExecutionModeSupported,
	riskCommandResultSchema,
	runPreTradeCheckCommandSchema,
} from "@anxionos/contracts/risk";
import {
	createCheckCompletedEvent,
	createPermitIssuedEvent,
} from "../../domain/events/risk-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { RiskUnitOfWork } from "../../domain/ports/risk-unit-of-work";
import {
	compareDecimalAmounts,
	loadIdempotentByIntentHash,
	loadIdempotentCommandResultWithGuard,
	replayIdempotentCommandJournalEntry,
	toCommandResultSnapshot,
} from "../command-support";
import { throwRiskError } from "../errors";

export interface RunPreTradeCheckDeps {
	unitOfWork: RiskUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function runPreTradeCheck(
	deps: RunPreTradeCheckDeps,
	input: RunPreTradeCheckCommand,
): Promise<RiskCommandResult> {
	const command = runPreTradeCheckCommandSchema.parse(input);
	assertRiskExecutionModeSupported(command.executionMode);
	const replayByCommand = await loadIdempotentCommandResultWithGuard(
		deps.commandJournal,
		command.commandId,
		command.organizationId,
	);
	if (replayByCommand) return replayByCommand;
	const replayByIntent = await loadIdempotentByIntentHash(
		deps.commandJournal,
		command.organizationId,
		command.intentHash,
	);
	if (replayByIntent) return replayByIntent;
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const racedByCommand = await ctx.commandJournal.findByCommandId(
			command.commandId,
		);
		if (racedByCommand) {
			return replayIdempotentCommandJournalEntry(
				racedByCommand,
				command.organizationId,
			);
		}
		const racedByIntent = await ctx.commandJournal.findByIntentHash(
			command.organizationId,
			command.intentHash,
		);
		if (racedByIntent) {
			return replayIdempotentCommandJournalEntry(
				racedByIntent,
				command.organizationId,
			);
		}
		const epoch = await ctx.epochRegistry.findByOrganization(
			command.organizationId,
		);
		if (!epoch || epoch.currentRiskEpoch !== command.riskEpoch) {
			throwRiskError("RK_PERMIT_STALE", "risk epoch mismatch");
		}
		const activeKillSwitch = await ctx.killSwitch.findActiveForCheck(
			command.organizationId,
			command.portfolioId,
		);
		const policy = await ctx.limitPolicies.findActiveByOrganization(
			command.organizationId,
		);
		let checkResult = "PASS";
		let denyReasonCode: string | undefined;
		if (activeKillSwitch) {
			checkResult = "DENY";
			denyReasonCode = "RK_KILL_SWITCH_ACTIVE";
		} else if (!policy) {
			checkResult = "DENY";
			denyReasonCode = "RK_CONFIG_REQUIRED";
		} else if (
			compareDecimalAmounts(command.notionalAmount, policy.maxNotional) > 0
		) {
			checkResult = "DENY";
			denyReasonCode = "RK_LIMIT_EXCEEDED";
		}
		const checkId = `rk_chk_${randomUUID()}`;
		const savedCheck = await ctx.checkResults.save({
			id: checkId,
			organizationId: command.organizationId,
			portfolioId: command.portfolioId,
			intentHash: command.intentHash,
			notionalAmount: command.notionalAmount,
			authorityEpoch: command.authorityEpoch,
			riskEpoch: command.riskEpoch,
			executionMode: command.executionMode,
			checkResult,
			denyReasonCode: denyReasonCode ?? null,
		});
		const events = [
			createCheckCompletedEvent({
				checkId: savedCheck.id,
				organizationId: command.organizationId,
				portfolioId: command.portfolioId,
				intentHash: command.intentHash,
				checkResult,
				denyReasonCode,
				notionalAmount: command.notionalAmount,
				authorityEpoch: command.authorityEpoch,
				riskEpoch: command.riskEpoch,
				executionMode: command.executionMode,
			}),
		];
		let permitId: string | undefined;
		if (checkResult === "PASS") {
			permitId = `rk_pmt_${randomUUID()}`;
			await ctx.permits.save({
				id: permitId,
				organizationId: command.organizationId,
				checkId: savedCheck.id,
				intentHash: command.intentHash,
				authorityEpoch: command.authorityEpoch,
				riskEpoch: command.riskEpoch,
				status: "ISSUED",
			});
			events.push(
				createPermitIssuedEvent({
					permitId,
					checkId: savedCheck.id,
					organizationId: command.organizationId,
					intentHash: command.intentHash,
					authorityEpoch: command.authorityEpoch,
					riskEpoch: command.riskEpoch,
				}),
			);
		}
		await ctx.publishEvents(events);
		const result = riskCommandResultSchema.parse({
			aggregateId: savedCheck.id,
			revision: 1,
			checkId: savedCheck.id,
			permitId,
			checkResult,
			denyReasonCode,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "runPreTradeCheck",
			intentHash: command.intentHash,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
