import {
	governanceCommandResultSchema,
	revokeGrantCommandSchema,
	type GovernanceCommandResult,
	type RevokeGrantCommand,
} from "@anxionos/contracts/governance";
import { isGrantRevoked } from "../../domain/entities/grant";
import { createAuthorityEpochBumpedEvent, createGrantRevokedEvent } from "../../domain/events/governance-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { GovernanceUnitOfWork } from "../../domain/ports/governance-unit-of-work";
import { loadIdempotentCommandResult, toCommandResultSnapshot } from "../command-support";
import { parseCommandResultSnapshot, throwGovernanceError } from "../errors";

export interface RevokeGrantDeps {
	unitOfWork: GovernanceUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function revokeGrant(
	deps: RevokeGrantDeps,
	input: RevokeGrantCommand,
): Promise<GovernanceCommandResult> {
	const command = revokeGrantCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResult(deps.commandJournal, command.commandId);
	if (replay) {
		return replay;
	}
	return deps.unitOfWork.runInTransaction(async (context) => {
		const raced = await context.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			return parseCommandResultSnapshot(raced.responseSnapshot);
		}
		const grant = await context.grantRepository.findById(command.grantId);
		if (!grant) {
			throwGovernanceError("GOV_GRANT_NOT_FOUND", `Grant ${command.grantId} not found`);
		}
		if (isGrantRevoked(grant)) {
			const currentEpoch = await context.authorityEpochStore.get(grant.scopeId);
			const unchanged = governanceCommandResultSchema.parse({
				aggregateId: grant.id,
				revision: grant.revision,
				authorityEpoch: currentEpoch.epoch,
			});
			await context.commandJournal.record({
				commandId: command.commandId,
				commandName: "RevokeGrant",
				aggregateId: grant.id,
				aggregateType: "Grant",
				revision: grant.revision,
				responseSnapshot: toCommandResultSnapshot(unchanged),
			});
			return unchanged;
		}
		const bumpedEpoch = await context.authorityEpochStore.increment(grant.scopeId);
		const now = new Date();
		const revision = grant.revision + 1;
		const updated = await context.grantRepository.save({
			...grant,
			status: "revoked",
			revision,
			updatedAt: now,
		});
		const result = governanceCommandResultSchema.parse({
			aggregateId: updated.id,
			revision: updated.revision,
			authorityEpoch: bumpedEpoch.epoch,
		});
		const events = [
			createGrantRevokedEvent({
				grantId: updated.id,
				scopeId: updated.scopeId,
				authorityEpoch: bumpedEpoch.epoch,
				revision: updated.revision,
			}),
			createAuthorityEpochBumpedEvent({
				scopeId: updated.scopeId,
				epoch: bumpedEpoch.epoch,
				reason: "RevokeGrant",
			}),
		];
		await context.commandJournal.record({
			commandId: command.commandId,
			commandName: "RevokeGrant",
			aggregateId: updated.id,
			aggregateType: "Grant",
			revision: updated.revision,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		await context.publishEvents(events);
		return result;
	});
}
