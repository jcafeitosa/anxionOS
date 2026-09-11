import { randomUUID } from "node:crypto";
import {
	type GovernanceCommandResult,
	governanceCommandResultSchema,
	type IssueMandateCommand,
	issueMandateCommandSchema,
} from "@anxionos/contracts/governance";
import { isGrantActive } from "../../domain/entities/grant";
import { createMandateIssuedEvent } from "../../domain/events/governance-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { GovernanceUnitOfWork } from "../../domain/ports/governance-unit-of-work";
import type { GrantRepository } from "../../domain/ports/grant-repository";
import type { TenantContext } from "../../domain/ports/tenant-context";
import {
	loadIdempotentCommandResult,
	recordGovernanceCommand,
	toCommandResultSnapshot,
} from "../command-support";
import { throwGovernanceError } from "../errors";

export interface IssueMandateDeps {
	unitOfWork: GovernanceUnitOfWork;
	commandJournal: CommandJournalRepository;
	grantRepository: GrantRepository;
}

export async function issueMandate(
	deps: IssueMandateDeps,
	input: IssueMandateCommand,
): Promise<GovernanceCommandResult> {
	const command = issueMandateCommandSchema.parse(input);

	// ANX-476/B (MEDIUM do G2) — a leitura pre-transacao serve so' para derivar o
	// escopo da transacao (tenant/agency/principal). Ela NAO julga estado mutavel:
	// um grant revogado continua existindo, entao o retry legitimo de um comando
	// ja' commitado chega ao replay em vez de falhar com `GOV_GRANT_REVOKED`. A
	// checagem de estado roda DEPOIS do replay, dentro da transacao.
	const backingGrant = await deps.grantRepository.findById(command.grantId);
	if (!backingGrant) {
		throwGovernanceError(
			"GOV_GRANT_NOT_FOUND",
			`Backing grant ${command.grantId} not found`,
		);
	}

	const tenantContext: TenantContext = {
		tenantId: backingGrant.tenantId,
		agencyId: backingGrant.agencyId,
		principalId: backingGrant.granteePrincipalId,
	};

	return deps.unitOfWork.runInTransaction(tenantContext, async (context) => {
		// ANX-476/FURO 4 — mesma key so' repete para o MESMO mandate
		// (grant de lastro + agente + tipo).
		const raced = await loadIdempotentCommandResult(
			context.commandJournal,
			command.commandId,
			{
				commandName: "IssueMandate",
				matchesAggregate: async (aggregateId) => {
					const existing =
						await context.mandateRepository.findById(aggregateId);
					if (!existing) {
						return false;
					}
					return (
						existing.grantId === command.grantId &&
						existing.agentId === command.agentId &&
						existing.mandateKind === command.mandateKind
					);
				},
			},
		);
		if (raced) {
			return raced;
		}

		const grant = await context.grantRepository.findById(command.grantId);
		if (!grant) {
			throwGovernanceError(
				"GOV_GRANT_NOT_FOUND",
				`Backing grant ${command.grantId} not found`,
			);
		}
		if (!isGrantActive(grant)) {
			throwGovernanceError(
				"GOV_GRANT_REVOKED",
				`Backing grant ${command.grantId} is not active`,
			);
		}

		const now = new Date();
		const mandateId = randomUUID();
		const mandate = await context.mandateRepository.save({
			id: mandateId,
			tenantId: grant.tenantId,
			agencyId: grant.agencyId,
			agentId: command.agentId,
			grantId: grant.id,
			mandateKind: command.mandateKind,
			status: "active",
			revision: 1,
			createdAt: now,
			updatedAt: now,
		});

		const result = governanceCommandResultSchema.parse({
			aggregateId: mandate.id,
			revision: mandate.revision,
		});

		await recordGovernanceCommand(context, {
			commandId: command.commandId,
			commandName: "IssueMandate",
			aggregateId: mandate.id,
			aggregateType: "Mandate",
			revision: mandate.revision,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		await context.publishEvents([
			createMandateIssuedEvent({
				mandateId: mandate.id,
				agencyId: mandate.agencyId,
				agentId: mandate.agentId,
				mandateKind: mandate.mandateKind,
				grantId: mandate.grantId,
				revision: mandate.revision,
			}),
		]);
		return result;
	});
}
