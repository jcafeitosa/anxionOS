import type {
	AttachIncidentRunbookCommand,
	OperationsCommandResult,
} from "@anxionos/contracts/operations";
import {
	attachIncidentRunbookCommandSchema,
	operationsCommandResultSchema,
} from "@anxionos/contracts/operations";
import { IncidentRevisionConflictError } from "../../domain/errors/incident-errors";
import { createIncidentRunbookAttachedEvent } from "../../domain/events/operations-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { OperationsUnitOfWork } from "../../domain/ports/operations-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwOperationsError } from "../errors";

export interface AttachIncidentRunbookDeps {
	unitOfWork: OperationsUnitOfWork;
	commandJournal: CommandJournalRepository;
	now?: () => string;
}

export async function attachIncidentRunbook(
	deps: AttachIncidentRunbookDeps,
	input: AttachIncidentRunbookCommand,
): Promise<OperationsCommandResult> {
	const command = attachIncidentRunbookCommandSchema.parse(input);
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

		const incident = await ctx.incidents.findById(command.incidentId);
		if (!incident) {
			throwOperationsError("OPS_INCIDENT_NOT_FOUND", "incident not found");
		}
		if (incident.organizationId !== command.organizationId) {
			throwOperationsError(
				"OPS_CROSS_TENANT",
				"incident organization mismatch",
			);
		}
		if (incident.revision !== command.expectedRevision) {
			throwOperationsError(
				"OPS_REVISION_CONFLICT",
				"incident revision conflict",
			);
		}

		const nowIso = deps.now?.() ?? new Date().toISOString();
		const nextRevision = incident.revision + 1;
		let updated;
		try {
			updated = await ctx.incidents.update({
				...incident,
				runbookId: command.runbookId,
				runbookVersion: command.runbookVersion,
				runbookAttachedAt: nowIso,
				responsiblePrincipalId:
					command.responsiblePrincipalId ?? incident.responsiblePrincipalId,
				revision: nextRevision,
				expectedRevision: incident.revision,
			});
		} catch (error) {
			if (error instanceof IncidentRevisionConflictError) {
				throwOperationsError(
					"OPS_REVISION_CONFLICT",
					"incident revision conflict",
				);
			}
			throw error;
		}

		await ctx.publishEvents([
			createIncidentRunbookAttachedEvent({
				incidentId: updated.id,
				organizationId: updated.organizationId,
				runbookId: command.runbookId,
				runbookVersion: command.runbookVersion,
				responsiblePrincipalId: command.responsiblePrincipalId,
				evidence: command.evidence,
				attachedAt: nowIso,
				revision: updated.revision,
			}),
		]);

		const result = operationsCommandResultSchema.parse({
			aggregateId: updated.id,
			revision: updated.revision,
			incidentId: updated.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "attachIncidentRunbook",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
