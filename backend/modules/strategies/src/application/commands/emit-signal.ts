import { randomUUID } from "node:crypto";
import type {
	EmitSignalCommand,
	StrategiesCommandResult,
} from "@anxionos/contracts/strategies";
import {
	emitSignalCommandSchema,
	strategiesCommandResultSchema,
} from "@anxionos/contracts/strategies";
import { createSignalEmittedEvent } from "../../domain/events/strategies-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { StrategiesUnitOfWork } from "../../domain/ports/strategies-unit-of-work";
import {
	loadIdempotentCommandResultWithGuard,
	replayIdempotentCommandJournalEntry,
	toCommandResultSnapshot,
} from "../command-support";
import { throwStrategiesError } from "../errors";

export interface EmitSignalDeps {
	unitOfWork: StrategiesUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function emitSignal(
	deps: EmitSignalDeps,
	input: EmitSignalCommand,
): Promise<StrategiesCommandResult> {
	const command = emitSignalCommandSchema.parse(input);
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
		const strategy = await ctx.strategies.findById(
			command.strategyId,
			command.organizationId,
		);
		if (!strategy) {
			throwStrategiesError(
				"ST_STRATEGY_NOT_FOUND",
				`Strategy ${command.strategyId} not found`,
			);
		}
		if (command.deploymentId) {
			const deployment = await ctx.deployments.findById(
				command.deploymentId,
				command.organizationId,
			);
			if (!deployment || deployment.strategyId !== command.strategyId) {
				throwStrategiesError(
					"ST_DEPLOYMENT_NOT_FOUND",
					`Deployment ${command.deploymentId} not found`,
				);
			}
		}
		const expiresAtMs = Date.parse(command.expiresAt);
		if (Number.isNaN(expiresAtMs) || expiresAtMs <= Date.now()) {
			throwStrategiesError(
				"ST_SIGNAL_EXPIRED",
				"Signal expiresAt must be a future timestamp",
			);
		}
		const signalId = `st_sig_${randomUUID()}`;
		await ctx.signals.save({
			id: signalId,
			organizationId: command.organizationId,
			strategyId: command.strategyId,
			deploymentId: command.deploymentId ?? null,
			instrumentRefs: command.instrumentRefs,
			valueRef: command.valueRef,
			expiresAt: command.expiresAt,
			revision: 1,
		});
		await ctx.publishEvents([
			createSignalEmittedEvent({
				signalId,
				organizationId: command.organizationId,
				strategyId: command.strategyId,
				deploymentId: command.deploymentId ?? null,
				instrumentRefs: command.instrumentRefs,
				valueRef: command.valueRef,
				expiresAt: command.expiresAt,
			}),
		]);
		const result = strategiesCommandResultSchema.parse({
			aggregateId: signalId,
			revision: 1,
			strategyId: command.strategyId,
			signalId,
			deploymentId: command.deploymentId,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "emitSignal",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
