import { randomUUID } from "node:crypto";
import type {
	ExecutionCommandResult,
	OpenExecutionSessionCommand,
} from "@anxionos/contracts/execution";
import {
	assertExecutionModuleModeSupported,
	executionCommandResultSchema,
	openExecutionSessionCommandSchema,
} from "@anxionos/contracts/execution";
import { createSessionOpenedEvent } from "../../domain/events/execution-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { ExecutionUnitOfWork } from "../../domain/ports/execution-unit-of-work";
import type { ExecutionTransactionContext } from "../../domain/ports/execution-unit-of-work";
import type {
	RiskPermitValidationFailure,
	RiskPermitValidationPort,
} from "../../domain/ports/risk-permit-validation";
import {
	loadIdempotentCommandResultWithGuard,
	replayIdempotentCommandJournalEntry,
	toCommandResultSnapshot,
} from "../command-support";
import { throwExecutionError } from "../errors";

export interface OpenExecutionSessionDeps {
	unitOfWork: ExecutionUnitOfWork;
	commandJournal: CommandJournalRepository;
	riskPermitValidation: RiskPermitValidationPort;
}

async function ensureSimulatedVenueAdapter(
	ctx: ExecutionTransactionContext,
	organizationId: string,
) {
	const existing =
		await ctx.venueAdapterRefs.findSimulatedByOrganization(organizationId);
	if (existing) return existing.id;
	const adapterId = `ex_vad_${randomUUID()}`;
	await ctx.venueAdapterRefs.save({
		id: adapterId,
		organizationId,
		adapterKind: "SIMULATED",
		status: "ACTIVE",
	});
	const ensured =
		await ctx.venueAdapterRefs.findSimulatedByOrganization(organizationId);
	if (!ensured) {
		throwExecutionError(
			"EX_SESSION_NOT_FOUND",
			"simulated venue adapter seed failed",
		);
	}
	return ensured.id;
}
function mapPermitFailure(failure: RiskPermitValidationFailure | undefined) {
	if (failure === "STALE") {
		throwExecutionError("EX_PERMIT_STALE", "risk permit epoch stale");
	}
	throwExecutionError("EX_PERMIT_BYPASS", "risk permit validation failed");
}
export async function openExecutionSession(
	deps: OpenExecutionSessionDeps,
	input: OpenExecutionSessionCommand,
): Promise<ExecutionCommandResult> {
	const command = openExecutionSessionCommandSchema.parse(input);
	assertExecutionModuleModeSupported(command.executionMode);
	const replay = await loadIdempotentCommandResultWithGuard(
		deps.commandJournal,
		command.commandId,
		command.organizationId,
	);
	if (replay) return replay;
	const permitCheck = await deps.riskPermitValidation.validatePermit({
		organizationId: command.organizationId,
		riskPermitId: command.riskPermitId,
		intentHash: command.intentHash,
		authorityEpoch: command.authorityEpoch,
		riskEpoch: command.riskEpoch,
	});
	if (!permitCheck.valid) {
		mapPermitFailure(permitCheck.failure);
	}
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const raced = await ctx.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			return replayIdempotentCommandJournalEntry(
				raced,
				command.organizationId,
			);
		}
		const venueAdapterRefId = await ensureSimulatedVenueAdapter(
			ctx,
			command.organizationId,
		);
		const sessionId = `ex_ses_${randomUUID()}`;
		await ctx.sessions.save({
			id: sessionId,
			organizationId: command.organizationId,
			status: "OPEN",
			intentHash: command.intentHash,
			riskPermitId: command.riskPermitId,
			authorityEpoch: command.authorityEpoch,
			riskEpoch: command.riskEpoch,
			executionMode: command.executionMode,
			venueAdapterRefId,
		});
		await ctx.publishEvents([
			createSessionOpenedEvent({
				sessionId,
				organizationId: command.organizationId,
				intentHash: command.intentHash,
				riskPermitId: command.riskPermitId,
				authorityEpoch: command.authorityEpoch,
				riskEpoch: command.riskEpoch,
				executionMode: command.executionMode,
				venueAdapterRefId,
			}),
		]);
		const result = executionCommandResultSchema.parse({
			aggregateId: sessionId,
			revision: 1,
			sessionId,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "openExecutionSession",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
