import { randomUUID } from "node:crypto";
import {
	type ActivateBreakGlassCommand,
	activateBreakGlassCommandSchema,
	type GovernanceCommandResult,
	governanceCommandResultSchema,
	isKnownGrantCapability,
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
	recordGovernanceCommand,
	toCommandResultSnapshot,
} from "../command-support";
import { throwGovernanceError } from "../errors";

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
	// ANX-466/N2 (LOW da revalidacao G4): o invariante de catalogo vale para TODO
	// caminho que grava grant, nao so' a rota HTTP. Break-glass nao tinha a
	// checagem e gravava capability fora do catalogo (sem ganho de autoridade
	// hoje, mas perpetuava token que o sistema nao consome).
	if (!isKnownGrantCapability(command.capability)) {
		throwGovernanceError(
			"GOV_CAPABILITY_UNKNOWN",
			`Capability ${command.capability} is not in the grant capability catalog`,
		);
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
		const incidentRef = command.incidentRef ?? command.commandId;
		// ANX-476/FURO 4 — mesma key so' repete para a MESMA elevacao (alvo,
		// capability, escopo, incidente e janela de validade).
		const raced = await loadIdempotentCommandResult(
			context.commandJournal,
			command.commandId,
			{
				commandName: "ActivateBreakGlass",
				matchesAggregate: async (aggregateId) => {
					const existing = await context.grantRepository.findById(aggregateId);
					if (!existing) {
						return false;
					}
					return (
						existing.granteePrincipalId === command.granteePrincipalId &&
						existing.capability === command.capability &&
						existing.scopeId === command.scopeId &&
						existing.resourceRef === `break-glass:${incidentRef}` &&
						(existing.validUntil?.toISOString() ?? null) ===
							expiresAt.toISOString()
					);
				},
			},
		);
		if (raced) {
			return raced;
		}

		const bumpedEpoch = await context.authorityEpochStore.increment(
			command.scopeId,
			command.scopeId,
			command.scopeId,
		);
		const grantId = randomUUID();
		const saved = await context.grantRepository.save({
			id: grantId,
			tenantId: command.scopeId,
			agencyId: command.scopeId,
			scopeId: command.scopeId,
			scopeKind: "agency",
			granteePrincipalId: command.granteePrincipalId,
			granteeAgentId: null,
			// Break-glass e' derivado de incidente, nao de um emissor principal:
			// revogavel por owner/admin da agencia (ANX-469).
			issuedByPrincipalId: null,
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

		await recordGovernanceCommand(context, {
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
