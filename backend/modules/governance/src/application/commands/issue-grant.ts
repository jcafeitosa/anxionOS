import { randomUUID } from "node:crypto";
import {
	governanceCommandResultSchema,
	issueGrantCommandSchema,
	type GovernanceCommandResult,
	type IssueGrantCommand,
} from "@anxionos/contracts/governance";
import { createAuthorityEpochBumpedEvent, createGrantIssuedEvent } from "../../domain/events/governance-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { GovernanceUnitOfWork } from "../../domain/ports/governance-unit-of-work";
import type { PrincipalLookup } from "../../domain/ports/principal-lookup";
import { loadIdempotentCommandResult, toCommandResultSnapshot } from "../command-support";
import { parseCommandResultSnapshot, throwGovernanceError } from "../errors";

export interface IssueGrantInput extends IssueGrantCommand {
	scopeKind?: "agency" | "organization";
}

export interface IssueGrantDeps {
	unitOfWork: GovernanceUnitOfWork;
	commandJournal: CommandJournalRepository;
	principalLookup: PrincipalLookup;
}

export async function issueGrant(
	deps: IssueGrantDeps,
	input: IssueGrantInput,
): Promise<GovernanceCommandResult> {
	const command = issueGrantCommandSchema.parse(input);
	const scopeKind = input.scopeKind ?? "agency";
	const replay = await loadIdempotentCommandResult(deps.commandJournal, command.commandId);
	if (replay) {
		return replay;
	}
	return deps.unitOfWork.runInTransaction(async (context) => {
		const raced = await context.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			return parseCommandResultSnapshot(raced.responseSnapshot);
		}
		const granteeExists = await deps.principalLookup.exists(command.granteePrincipalId);
		if (!granteeExists) {
			throwGovernanceError(
				"GOV_PRINCIPAL_NOT_FOUND",
				`Principal ${command.granteePrincipalId} not found`,
			);
		}
		const bumpedEpoch = await context.authorityEpochStore.increment(command.scopeId);
		const now = new Date();
		const grantId = randomUUID();
		const revision = 1;
		const validUntil = command.validUntil ? new Date(command.validUntil) : null;
		const saved = await context.grantRepository.save({
			id: grantId,
			scopeId: command.scopeId,
			scopeKind,
			granteePrincipalId: command.granteePrincipalId,
			granteeAgentId: null,
			capability: command.capability,
			resourceRef: command.resourceRef ?? null,
			status: "active",
			validFrom: now,
			validUntil,
			derivedFromMembershipId: null,
			authorityEpochAtIssue: bumpedEpoch.epoch,
			revision,
			createdAt: now,
			updatedAt: now,
		});
		const result = governanceCommandResultSchema.parse({
			aggregateId: saved.id,
			revision: saved.revision,
			authorityEpoch: bumpedEpoch.epoch,
		});
		const events = [
			createGrantIssuedEvent({
				grantId: saved.id,
				scopeId: saved.scopeId,
				granteePrincipalId: saved.granteePrincipalId,
				capability: saved.capability,
				status: saved.status,
				authorityEpoch: bumpedEpoch.epoch,
				revision: saved.revision,
			}),
			createAuthorityEpochBumpedEvent({
				scopeId: command.scopeId,
				epoch: bumpedEpoch.epoch,
				reason: "IssueGrant",
			}),
		];
		await context.commandJournal.record({
			commandId: command.commandId,
			commandName: "IssueGrant",
			aggregateId: saved.id,
			aggregateType: "Grant",
			revision: saved.revision,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		await context.publishEvents(events);
		return result;
	});
}
