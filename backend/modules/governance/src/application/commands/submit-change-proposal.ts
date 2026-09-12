import { randomUUID } from "node:crypto";
import {
	type GovernanceCommandResult,
	governanceCommandResultSchema,
	type SubmitChangeProposalCommand,
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
	recordGovernanceCommand,
	toCommandResultSnapshot,
} from "../command-support";
import {
	applyPrincipalExistenceProbe,
	probePrincipalExistence,
} from "../principal-probe";

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
	const tenantContext: TenantContext = {
		tenantId: command.scopeId,
		agencyId: command.scopeId,
		principalId: input.proposerPrincipalId,
	};
	// ANX-477 — sonda tolerante ANTES da transacao (ver `principal-probe.ts`):
	// nenhuma conexao extra do pool e' pedida com a transacao aberta, e o replay
	// continua resolvido antes de julgar a identidade.
	const principalProbe = await probePrincipalExistence(
		deps.principalLookup,
		input.proposerPrincipalId,
	);
	return deps.unitOfWork.runInTransaction(tenantContext, async (context) => {
		// ANX-476/FURO 4 — a key so' repete para a MESMA proposta
		// (escopo + tipo + payload + proponente). Nao ha lock da key: a
		// serializacao e' o bump de epoch e o perdedor de uma corrida e' derrubado
		// pelo INSERT atomico do journal (`ON CONFLICT DO NOTHING` → 409).
		const raced = await loadIdempotentCommandResult(
			context.commandJournal,
			command.commandId,
			{
				commandName: "SubmitChangeProposal",
				matchesAggregate: async (aggregateId) => {
					const existing =
						await context.changeProposalRepository.findById(aggregateId);
					if (!existing) {
						return false;
					}
					return (
						existing.scopeId === command.scopeId &&
						existing.kind === command.kind &&
						existing.payloadHash === command.payloadHash &&
						existing.proposerPrincipalId === input.proposerPrincipalId
					);
				},
			},
		);
		if (raced) {
			return raced;
		}
		applyPrincipalExistenceProbe(principalProbe, input.proposerPrincipalId);
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
		await recordGovernanceCommand(context, {
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
