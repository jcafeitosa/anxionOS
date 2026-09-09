import { randomUUID } from "node:crypto";
import {
	governanceCommandResultSchema,
	resolveApprovalCommandSchema,
	type GovernanceCommandResult,
	type ResolveApprovalCommand,
} from "@anxionos/contracts/governance";
import { isChangeProposalPending } from "../../domain/entities/change-proposal";
import { createApprovalResolvedEvent } from "../../domain/events/governance-events";
import { hasOwnerAuthority, requiresOwnerApproval } from "../../domain/policies/owner-approval-policy";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { GovernanceUnitOfWork } from "../../domain/ports/governance-unit-of-work";
import { loadIdempotentCommandResult, toCommandResultSnapshot } from "../command-support";
import { parseCommandResultSnapshot, throwGovernanceError } from "../errors";

export interface ResolveApprovalInput extends ResolveApprovalCommand {
	resolverPrincipalId: string;
}

export interface ResolveApprovalDeps {
	unitOfWork: GovernanceUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function resolveApproval(
	deps: ResolveApprovalDeps,
	input: ResolveApprovalInput,
): Promise<GovernanceCommandResult> {
	const command = resolveApprovalCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResult(deps.commandJournal, command.commandId);
	if (replay) {
		return replay;
	}
	return deps.unitOfWork.runInTransaction(async (context) => {
		const raced = await context.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			return parseCommandResultSnapshot(raced.responseSnapshot);
		}
		const proposal = await context.changeProposalRepository.findById(command.changeProposalId);
		if (!proposal) {
			throwGovernanceError(
				"GOV_CHANGE_PROPOSAL_NOT_FOUND",
				`ChangeProposal ${command.changeProposalId} not found`,
			);
		}
		if (!isChangeProposalPending(proposal)) {
			throwGovernanceError(
				"GOV_PROPOSAL_NOT_PENDING",
				`ChangeProposal ${proposal.id} is not pending`,
			);
		}
		if (requiresOwnerApproval(proposal.kind)) {
			const effectiveGrants = await context.grantRepository.listEffective(
				proposal.scopeId,
				input.resolverPrincipalId,
			);
			if (!hasOwnerAuthority(effectiveGrants)) {
				throwGovernanceError(
					"GOV_INSUFFICIENT_AUTHORITY",
					`Principal ${input.resolverPrincipalId} lacks Owner authority for ${proposal.kind} proposal`,
				);
			}
		}
		const now = new Date();
		const approvalId = randomUUID();
		const approvalRevision = 1;
		const proposalRevision = proposal.revision + 1;
		const nextStatus = command.decision === "APPROVED" ? "approved" : "rejected";
		const savedApproval = await context.approvalRepository.save({
			id: approvalId,
			changeProposalId: proposal.id,
			actionRef: null,
			resolverPrincipalId: input.resolverPrincipalId,
			decision: command.decision,
			reason: command.reason ?? null,
			resolvedAt: now,
			revision: approvalRevision,
		});
		const updatedProposal = await context.changeProposalRepository.save({
			...proposal,
			status: nextStatus,
			revision: proposalRevision,
			updatedAt: now,
		});
		const result = governanceCommandResultSchema.parse({
			aggregateId: savedApproval.id,
			revision: savedApproval.revision,
		});
		const events = [
			createApprovalResolvedEvent({
				approvalId: savedApproval.id,
				changeProposalId: updatedProposal.id,
				decision: savedApproval.decision,
				resolverPrincipalId: savedApproval.resolverPrincipalId,
				revision: savedApproval.revision,
			}),
		];
		await context.commandJournal.record({
			commandId: command.commandId,
			commandName: "ResolveApproval",
			aggregateId: savedApproval.id,
			aggregateType: "Approval",
			revision: savedApproval.revision,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		await context.publishEvents(events);
		return result;
	});
}
