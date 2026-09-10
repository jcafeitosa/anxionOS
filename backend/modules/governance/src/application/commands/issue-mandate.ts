import { randomUUID } from "node:crypto";
import {
	type GovernanceCommandResult,
	type IssueMandateCommand,
	governanceCommandResultSchema,
	issueMandateCommandSchema,
} from "@anxionos/contracts/governance";
import type { TenantContext } from "../../domain/ports/tenant-context";
import { isGrantActive } from "../../domain/entities/grant";
import { createMandateIssuedEvent } from "../../domain/events/governance-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { GovernanceUnitOfWork } from "../../domain/ports/governance-unit-of-work";
import type { GrantRepository } from "../../domain/ports/grant-repository";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwGovernanceError } from "../errors";

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
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
	);
	if (replay) {
		return replay;
	}

	const backingGrant = await deps.grantRepository.findById(command.grantId);
	if (!backingGrant) {
		throwGovernanceError(
			"GOV_GRANT_NOT_FOUND",
			`Backing grant ${command.grantId} not found`,
		);
	}
	if (!isGrantActive(backingGrant)) {
		throwGovernanceError(
			"GOV_GRANT_REVOKED",
			`Backing grant ${command.grantId} is not active`,
		);
	}

	const tenantContext: TenantContext = {
		tenantId: backingGrant.tenantId,
		agencyId: backingGrant.agencyId,
		principalId: backingGrant.granteePrincipalId,
	};

	return deps.unitOfWork.runInTransaction(tenantContext, async (context) => {
		const raced = await context.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			return parseCommandResultSnapshot(raced.responseSnapshot);
		}

		const grant = await context.grantRepository.findById(command.grantId);
		if (!grant || !isGrantActive(grant)) {
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

		await context.commandJournal.record({
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
