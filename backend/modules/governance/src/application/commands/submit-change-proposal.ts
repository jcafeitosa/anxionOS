import { randomUUID } from "node:crypto";
import {
	type GovernanceCommandResult,
	type SubmitChangeProposalCommand,
	governanceCommandResultSchema,
	submitChangeProposalCommandSchema,
} from "@anxionos/contracts/governance";
import { defaultRequiredApprovals } from "../../domain/entities/change-proposal";
import { createChangeProposalSubmittedEvent } from "../../domain/events/governance-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { GovernanceUnitOfWork } from "../../domain/ports/governance-unit-of-work";
import type { PrincipalLookup } from "../../domain/ports/principal-lookup";
import type { TenantContext } from "../../domain/ports/tenant-context";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwGovernanceError } from "../errors";

export interface SubmitChangeProposalInput extends SubmitChangeProposalCommand {
	proposerPrincipalId: string;
}

export interface SubmitChangeProposalDeps {
	unitOfWork: GovernanceUnitOfWork;
	commandJournal: CommandJournalRepository;
	principalLookup: PrincipalLookup;
}

export async function submitChangeProposal(
	deps: SubmitChangeProposalDeps,
	input: SubmitChangeProposalInput,
): Promise<GovernanceCommandResult> {
	const command = submitChangeProposalCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
	);
	if (replay) {
		return replay;
	}
	const tenantContext: TenantContext = {
		tenantId: command.scopeId,
		agencyId: command.scopeId,
		principalId: input.proposerPrincipalId,
	};
	return deps.unitOfWork.runInTransaction(tenantContext, async (context) => {
		const raced = await context.commandJournal.findByCommandId(
			command.commandId,
		);
		if (raced) {
			return parseCommandResultSnapshot(raced.responseSnapshot);
		}
		const proposerExists = await deps.principalLookup.exists(
			input.proposerPrincipalId,
		);
		if (!proposerExists) {
			throwGovernanceError(
				"GOV_PRINCIPAL_NOT_FOUND",
				`Principal ${input.proposerPrincipalId} not found`,
			);
		}
		const now = new Date();
		const proposalId = randomUUID();
		const revision = 1;
		const saved = await context.changeProposalRepository.save({
			id: proposalId,
			tenantId: command.scopeId,
			agencyId: command.scopeId,
			scopeId: command.scopeId,
			kind: command.kind,
			payloadHash: command.payloadHash,
			proposerPrincipalId: input.proposerPrincipalId,
			status: "pending",
			requiredApprovals: defaultRequiredApprovals(command.kind),
			revision,
			createdAt: now,
			updatedAt: now,
		});
		const result = governanceCommandResultSchema.parse({
			aggregateId: saved.id,
			revision: saved.revision,
		});
		const events = [
			createChangeProposalSubmittedEvent({
				proposalId: saved.id,
				scopeId: saved.scopeId,
				kind: saved.kind,
				payloadHash: saved.payloadHash,
				revision: saved.revision,
			}),
		];
		await context.commandJournal.record({
			commandId: command.commandId,
			commandName: "SubmitChangeProposal",
			aggregateId: saved.id,
			aggregateType: "ChangeProposal",
			revision: saved.revision,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		await context.publishEvents(events);
		return result;
	});
}
