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
import { throwGovernanceError } from "../errors";

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
	// ANX-477 — a leitura de identidade usa a conexao que a transacao JA' segura
	// (`context.client`), nao uma SEGUNDA do pool compartilhado: com N comandos
	// concorrentes proximos de `pool.options.max` o pool esgotava. A leitura roda
	// DEPOIS do replay e da validacao de intencao, como no baseline: um replay
	// legitimo devolve o journal sem tocar a identidade.
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
		const proposerExists = await deps.principalLookup.exists(
			input.proposerPrincipalId,
			{ transactionClient: context.client },
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
