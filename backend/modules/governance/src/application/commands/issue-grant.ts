import { randomUUID } from "node:crypto";
import {
	type GovernanceCommandResult,
	type GovernanceScopeKind,
	governanceCommandResultSchema,
	type IssueGrantCommand,
	isPlatformOnlyCapability,
	issueGrantCommandSchema,
	PLATFORM_SCOPE_ID,
} from "@anxionos/contracts/governance";
import {
	createAuthorityEpochBumpedEvent,
	createGrantIssuedEvent,
} from "../../domain/events/governance-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { GovernanceUnitOfWork } from "../../domain/ports/governance-unit-of-work";
import type { PrincipalLookup } from "../../domain/ports/principal-lookup";
import type { TenantContext } from "../../domain/ports/tenant-context";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwGovernanceError } from "../errors";

export interface IssueGrantInput extends IssueGrantCommand {
	scopeKind?: GovernanceScopeKind;
}

export interface IssueGrantDeps {
	unitOfWork: GovernanceUnitOfWork;
	commandJournal: CommandJournalRepository;
	principalLookup: PrincipalLookup;
}

/**
 * ANX-462 — coerencia entre capability e escopo.
 *
 * Sem esta checagem, `POST /v1/agencies/:agencyId/grants` (autorizado para
 * `owner|admin|operator` daquela agencia) aceitava qualquer string em
 * `capability`, incluindo `console.platform`. Como `hasPlatformConsoleGrant`
 * nao filtrava escopo, o operador de agencia abria o console de PLATAFORMA.
 *
 * Regras: escopo PLATFORM exige o identificador canonico; capability
 * platform-only exige escopo PLATFORM.
 */
function assertCapabilityScopeCoherence(
	scopeId: string,
	scopeKind: GovernanceScopeKind,
	capability: string,
): void {
	if (scopeKind === "platform" && scopeId !== PLATFORM_SCOPE_ID) {
		throwGovernanceError(
			"GOV_CAPABILITY_SCOPE_MISMATCH",
			`Platform scope kind requires scopeId ${PLATFORM_SCOPE_ID}`,
		);
	}
	if (scopeKind !== "platform" && scopeId === PLATFORM_SCOPE_ID) {
		throwGovernanceError(
			"GOV_CAPABILITY_SCOPE_MISMATCH",
			"Platform scope id requires scopeKind 'platform'",
		);
	}
	if (scopeKind !== "platform" && isPlatformOnlyCapability(capability)) {
		throwGovernanceError(
			"GOV_CAPABILITY_SCOPE_MISMATCH",
			`Capability ${capability} requires PLATFORM scope`,
		);
	}
}

export async function issueGrant(
	deps: IssueGrantDeps,
	input: IssueGrantInput,
): Promise<GovernanceCommandResult> {
	const command = issueGrantCommandSchema.parse(input);
	const scopeKind: GovernanceScopeKind = input.scopeKind ?? "agency";
	assertCapabilityScopeCoherence(
		command.scopeId,
		scopeKind,
		command.capability,
	);
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
		principalId: command.granteePrincipalId,
	};
	return deps.unitOfWork.runInTransaction(tenantContext, async (context) => {
		const raced = await context.commandJournal.findByCommandId(
			command.commandId,
		);
		if (raced) {
			return parseCommandResultSnapshot(raced.responseSnapshot);
		}
		const granteeExists = await deps.principalLookup.exists(
			command.granteePrincipalId,
		);
		if (!granteeExists) {
			throwGovernanceError(
				"GOV_PRINCIPAL_NOT_FOUND",
				`Principal ${command.granteePrincipalId} not found`,
			);
		}
		const bumpedEpoch = await context.authorityEpochStore.increment(
			command.scopeId,
			command.scopeId,
			command.scopeId,
		);
		const now = new Date();
		const grantId = randomUUID();
		const revision = 1;
		const validUntil = command.validUntil ? new Date(command.validUntil) : null;
		const saved = await context.grantRepository.save({
			id: grantId,
			tenantId: command.scopeId,
			agencyId: command.scopeId,
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
			createGrantIssuedEvent(
				{
					grantId: saved.id,
					scopeId: saved.scopeId,
					granteePrincipalId: saved.granteePrincipalId,
					capability: saved.capability,
					status: saved.status,
					authorityEpoch: bumpedEpoch.epoch,
					revision: saved.revision,
					validFrom: saved.validFrom.toISOString(),
					validUntil: saved.validUntil?.toISOString() ?? null,
				},
				now,
			),
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
