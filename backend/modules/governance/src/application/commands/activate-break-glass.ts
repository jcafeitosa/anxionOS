import { randomUUID } from "node:crypto";
import {
	type ActivateBreakGlassCommand,
	activateBreakGlassCommandSchema,
	type GovernanceCommandResult,
	governanceCommandResultSchema,
} from "@anxionos/contracts/governance";
import {
	createAuthorityEpochBumpedEvent,
	createBreakGlassActivatedEvent,
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

const MAX_BREAK_GLASS_TTL_MS = 24 * 60 * 60 * 1000;

export interface ActivateBreakGlassDeps {
	unitOfWork: GovernanceUnitOfWork;
	commandJournal: CommandJournalRepository;
	principalLookup: PrincipalLookup;
}

export async function activateBreakGlass(
	deps: ActivateBreakGlassDeps,
	input: ActivateBreakGlassCommand,
): Promise<GovernanceCommandResult> {
	const command = activateBreakGlassCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
	);
	if (replay) {
		return replay;
	}

	const expiresAt = new Date(command.expiresAt);
	const now = new Date();
	if (expiresAt <= now) {
		throwGovernanceError(
			"GOV_INSUFFICIENT_AUTHORITY",
			"Break-glass expiresAt must be in the future",
		);
	}
	if (expiresAt.getTime() - now.getTime() > MAX_BREAK_GLASS_TTL_MS) {
		throwGovernanceError(
			"GOV_INSUFFICIENT_AUTHORITY",
			"Break-glass TTL exceeds maximum allowed window (24h)",
		);
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

		const bumpedEpoch = await context.authorityEpochStore.increment(
			command.scopeId,
			command.scopeId,
			command.scopeId,
		);
		const grantId = randomUUID();
		const incidentRef = command.incidentRef ?? command.commandId;
		const saved = await context.grantRepository.save({
			id: grantId,
			tenantId: command.scopeId,
			agencyId: command.scopeId,
			scopeId: command.scopeId,
			scopeKind: "agency",
			granteePrincipalId: command.granteePrincipalId,
			granteeAgentId: null,
			capability: command.capability,
			resourceRef: `break-glass:${incidentRef}`,
			status: "active",
			validFrom: now,
			validUntil: expiresAt,
			derivedFromMembershipId: null,
			authorityEpochAtIssue: bumpedEpoch.epoch,
			revision: 1,
			createdAt: now,
			updatedAt: now,
		});

		const result = governanceCommandResultSchema.parse({
			aggregateId: saved.id,
			revision: saved.revision,
			authorityEpoch: bumpedEpoch.epoch,
		});

		await context.commandJournal.record({
			commandId: command.commandId,
			commandName: "ActivateBreakGlass",
			aggregateId: saved.id,
			aggregateType: "Grant",
			revision: saved.revision,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		await context.publishEvents([
			createBreakGlassActivatedEvent({
				grantId: saved.id,
				scopeId: command.scopeId,
				granteePrincipalId: command.granteePrincipalId,
				capability: command.capability,
				reason: command.reason,
				expiresAt: command.expiresAt,
				incidentRef: command.incidentRef,
				revision: saved.revision,
			}),
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
				reason: "ActivateBreakGlass",
			}),
		]);
		return result;
	});
}
