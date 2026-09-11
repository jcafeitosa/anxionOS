import { randomUUID } from "node:crypto";
import type {
	OperationsCommandResult,
	RegisterRetentionPolicyCommand,
} from "@anxionos/contracts/operations";
import {
	operationsCommandResultSchema,
	registerRetentionPolicyCommandSchema,
} from "@anxionos/contracts/operations";
import { createRetentionPolicyRegisteredEvent } from "../../domain/events/operations-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { OperationsUnitOfWork } from "../../domain/ports/operations-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwOperationsError } from "../errors";

export interface RegisterRetentionPolicyDeps {
	unitOfWork: OperationsUnitOfWork;
	commandJournal: CommandJournalRepository;
}

/** ANX-313 S3 — register a tenant-scoped retention policy. */
export async function registerRetentionPolicy(
	deps: RegisterRetentionPolicyDeps,
	input: RegisterRetentionPolicyCommand,
): Promise<OperationsCommandResult> {
	const command = registerRetentionPolicyCommandSchema.parse(input);
	const existing = await deps.commandJournal.findByCommandId(command.commandId);
	if (existing && existing.organizationId !== command.organizationId) {
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

		const policyId = `ops_rpo_${randomUUID()}`;
		const now = new Date();
		await ctx.retentionPolicies.save({
			id: policyId,
			organizationId: command.organizationId,
			scope: command.scope,
			action: command.action,
			retentionDays: command.retentionDays,
			legalHold: command.legalHold,
			exportManifestRequired: command.exportManifestRequired,
			createdBy: command.createdBy,
			status: "ACTIVE",
			createdAt: now,
			updatedAt: now,
		});
		await ctx.publishEvents([
			createRetentionPolicyRegisteredEvent({
				policyId,
				organizationId: command.organizationId,
				scope: command.scope,
				action: command.action,
				retentionDays: command.retentionDays,
				legalHold: command.legalHold,
				exportManifestRequired: command.exportManifestRequired,
				createdBy: command.createdBy,
			}),
		]);
		const result = operationsCommandResultSchema.parse({
			aggregateId: policyId,
			revision: 1,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "registerRetentionPolicy",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
