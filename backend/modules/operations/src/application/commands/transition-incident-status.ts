import type {
	OperationsCommandResult,
	OperationsIncidentStatus,
	TransitionIncidentStatusCommand,
} from "@anxionos/contracts/operations";
import {
	operationsCommandResultSchema,
	transitionIncidentStatusCommandSchema,
} from "@anxionos/contracts/operations";
import { IncidentRevisionConflictError } from "../../domain/errors/incident-errors";
import { createIncidentStatusChangedEvent } from "../../domain/events/operations-events";
import {
	canTransitionIncidentStatus,
	isTerminalIncidentStatus,
} from "../../domain/incident-lifecycle";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { OperationsUnitOfWork } from "../../domain/ports/operations-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwOperationsError } from "../errors";

export interface TransitionIncidentStatusDeps {
	unitOfWork: OperationsUnitOfWork;
	commandJournal: CommandJournalRepository;
	now?: () => string;
}

export async function transitionIncidentStatus(
	deps: TransitionIncidentStatusDeps,
	input: TransitionIncidentStatusCommand,
): Promise<OperationsCommandResult> {
	const command = transitionIncidentStatusCommandSchema.parse(input);
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
		if (isTerminalIncidentStatus(incident.status as OperationsIncidentStatus)) {
			throwOperationsError(
				"OPS_INCIDENT_STATUS_INVALID",
				"incident is in terminal status",
			);
		}

		const fromStatus = incident.status as OperationsIncidentStatus;
		const toStatus = command.targetStatus;
		const hasRunbookAttached = Boolean(incident.runbookId);
		if (
			!canTransitionIncidentStatus(fromStatus, toStatus, {
				hasRunbookAttached,
			})
		) {
			throwOperationsError(
				"OPS_INCIDENT_STATUS_INVALID",
				`cannot transition incident from ${fromStatus} to ${toStatus}`,
			);
		}

		const nowIso = deps.now?.() ?? new Date().toISOString();
		const nextRevision = incident.revision + 1;
		let updated;
		try {
			updated = await ctx.incidents.update({
				...incident,
				status: toStatus,
				revision: nextRevision,
				resolvedAt: toStatus === "RESOLVED" ? nowIso : incident.resolvedAt,
				closedAt: toStatus === "CLOSED" ? nowIso : incident.closedAt,
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
			createIncidentStatusChangedEvent({
				incidentId: updated.id,
				organizationId: updated.organizationId,
				fromStatus,
				toStatus,
				revision: updated.revision,
				reason: command.reason,
				changedAt: nowIso,
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
			commandName: "transitionIncidentStatus",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
