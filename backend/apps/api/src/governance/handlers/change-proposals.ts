import { institutionalUuidSchema } from "@anxionos/contracts";
import {
	changeProposalKindSchema,
	changeProposalStatusSchema,
} from "@anxionos/contracts/governance";
import type { ChangeProposal } from "@anxionos/governance";
import { z } from "zod";
import type { GovernancePluginDeps } from "../plugin";

export const changeProposalItemSchema = z.object({
	id: institutionalUuidSchema,
	tenantId: institutionalUuidSchema,
	agencyId: institutionalUuidSchema,
	scopeId: institutionalUuidSchema,
	kind: changeProposalKindSchema,
	payloadHash: z.string().min(1),
	proposerPrincipalId: institutionalUuidSchema,
	status: changeProposalStatusSchema,
	requiredApprovals: z.number().int().positive(),
	revision: z.number().int().nonnegative(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export type ChangeProposalItemDto = z.infer<typeof changeProposalItemSchema>;

export function toChangeProposalDto(proposal: ChangeProposal): ChangeProposalItemDto {
	return {
		id: proposal.id,
		tenantId: proposal.tenantId,
		agencyId: proposal.agencyId,
		scopeId: proposal.scopeId,
		kind: proposal.kind,
		payloadHash: proposal.payloadHash,
		proposerPrincipalId: proposal.proposerPrincipalId,
		status: proposal.status,
		requiredApprovals: proposal.requiredApprovals,
		revision: proposal.revision,
		createdAt: proposal.createdAt.toISOString(),
		updatedAt: proposal.updatedAt.toISOString(),
	};
}

export async function handleListPendingChangeProposals(
	deps: GovernancePluginDeps,
	input: { agencyId: string },
) {
	const proposals = await deps.changeProposalRepository.findPendingByScope(
		input.agencyId,
	);
	return { changeProposals: proposals.map(toChangeProposalDto) };
}
