import { randomUUID } from "node:crypto";
import type {
	OperationsCommandResult,
	RegisterHealthCheckCommand,
} from "@anxionos/contracts/operations";
import {
	operationsCommandResultSchema,
	registerHealthCheckCommandSchema,
} from "@anxionos/contracts/operations";
import {
	createHealthDegradedEvent,
	isDegradedHealthStatus,
} from "../../domain/events/operations-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { OperationsUnitOfWork } from "../../domain/ports/operations-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwOperationsError } from "../errors";

export interface RegisterHealthCheckDeps {
	unitOfWork: OperationsUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function registerHealthCheck(
	deps: RegisterHealthCheckDeps,
	input: RegisterHealthCheckCommand,
): Promise<OperationsCommandResult> {
	const command = registerHealthCheckCommandSchema.parse(input);
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
		const existing = await ctx.healthChecks.findByOrganizationAndServiceId(
			command.organizationId,
			command.serviceId,
		);
		if (existing) {
			if (existing.organizationId !== command.organizationId) {
				throwOperationsError(
					"OPS_CROSS_TENANT",
					"health check organization mismatch",
				);
			}
			const updated = await ctx.healthChecks.update({
				...existing,
				status: command.status,
				probeDetails: command.probeDetails ?? null,
				checkedAt: command.checkedAt,
				revision: existing.revision + 1,
			});
			const events = [];
			if (isDegradedHealthStatus(command.status)) {
				events.push(
					createHealthDegradedEvent({
						healthCheckId: updated.id,
						organizationId: updated.organizationId,
						serviceId: updated.serviceId,
						status: updated.status,
						checkedAt: updated.checkedAt,
					}),
				);
			}
			if (events.length > 0) {
				await ctx.publishEvents(events);
			}
			const result = operationsCommandResultSchema.parse({
				aggregateId: updated.id,
				revision: updated.revision,
				healthCheckId: updated.id,
				idempotentReplay: true,
			});
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.organizationId,
				commandName: "registerHealthCheck",
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}
		const healthCheckId = `ops_hlt_${randomUUID()}`;
		const saved = await ctx.healthChecks.save({
			id: healthCheckId,
			organizationId: command.organizationId,
			serviceId: command.serviceId,
			status: command.status,
			probeDetails: command.probeDetails ?? null,
			checkedAt: command.checkedAt,
			revision: 1,
		});
		const events = [];
		if (isDegradedHealthStatus(command.status)) {
			events.push(
				createHealthDegradedEvent({
					healthCheckId: saved.id,
					organizationId: saved.organizationId,
					serviceId: saved.serviceId,
					status: saved.status,
					checkedAt: saved.checkedAt,
				}),
			);
		}
		if (events.length > 0) {
			await ctx.publishEvents(events);
		}
		const result = operationsCommandResultSchema.parse({
			aggregateId: saved.id,
			revision: saved.revision,
			healthCheckId: saved.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "registerHealthCheck",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
