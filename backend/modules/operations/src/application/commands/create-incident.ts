import { randomUUID } from "node:crypto";
import type {
	CreateIncidentCommand,
	OperationsCommandResult,
} from "@anxionos/contracts/operations";
import {
	createIncidentCommandSchema,
	operationsCommandResultSchema,
} from "@anxionos/contracts/operations";
import { createIncidentOpenedEvent } from "../../domain/events/operations-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { OperationsUnitOfWork } from "../../domain/ports/operations-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwOperationsError } from "../errors";

export interface CreateIncidentDeps {
	unitOfWork: OperationsUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function createIncident(
	deps: CreateIncidentDeps,
	input: CreateIncidentCommand,
): Promise<OperationsCommandResult> {
	const command = createIncidentCommandSchema.parse(input);
	const existingCommand = await deps.commandJournal.findByCommandId(
		command.commandId,
	);
	if (
		existingCommand &&
		existingCommand.organizationId !== command.organizationId
	) {
		throwOperationsError(
			"OPS_CROSS_TENANT",
			"command journal organization mismatch",
		);
	}
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
	);
	if (replay) return replay;
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const raced = await ctx.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			if (raced.organizationId !== command.organizationId) {
				throwOperationsError(
					"OPS_CROSS_TENANT",
					"command journal organization mismatch",
				);
			}
			const parsed = parseCommandResultSnapshot(raced.responseSnapshot);
			return operationsCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
		}
		const incidentId = `ops_inc_${randomUUID()}`;
		const openedAt = new Date().toISOString();
		const saved = await ctx.incidents.save({
			id: incidentId,
			organizationId: command.organizationId,
			title: command.title,
			description: command.description ?? null,
			severity: command.severity,
			status: "OPEN",
			serviceId: command.serviceId ?? null,
			openedAt,
			revision: 1,
			runbookId: null,
			runbookVersion: null,
			runbookAttachedAt: null,
			responsiblePrincipalId: null,
			resolvedAt: null,
			closedAt: null,
		});
		await ctx.publishEvents([
			createIncidentOpenedEvent({
				incidentId: saved.id,
				organizationId: saved.organizationId,
				title: saved.title,
				description: saved.description ?? undefined,
				severity: saved.severity,
				serviceId: saved.serviceId ?? undefined,
				openedAt: saved.openedAt,
			}),
		]);
		const result = operationsCommandResultSchema.parse({
			aggregateId: saved.id,
			revision: 1,
			incidentId: saved.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "createIncident",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
