import { randomUUID } from "node:crypto";
import {
	type CreateDelegationCommand,
	createDelegationCommandSchema,
	type GovernanceCommandResult,
	governanceCommandResultSchema,
	isKnownGrantCapability,
} from "@anxionos/contracts/governance";
import { isGrantActive } from "../../domain/entities/grant";
import {
	createAuthorityEpochBumpedEvent,
	createDelegationCreatedEvent,
	createGrantIssuedEvent,
} from "../../domain/events/governance-events";
import {
	capabilitySubsetsEqual,
	validateCapabilitySubset,
} from "../../domain/policies/delegation-capability";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { GovernanceUnitOfWork } from "../../domain/ports/governance-unit-of-work";
import type { GrantRepository } from "../../domain/ports/grant-repository";
import type { PrincipalLookup } from "../../domain/ports/principal-lookup";
import type { TenantContext } from "../../domain/ports/tenant-context";
import {
	loadIdempotentCommandResult,
	recordGovernanceCommand,
	toCommandResultSnapshot,
} from "../command-support";
import { throwGovernanceError } from "../errors";

export interface CreateDelegationDeps {
	unitOfWork: GovernanceUnitOfWork;
	commandJournal: CommandJournalRepository;
	grantRepository: GrantRepository;
	principalLookup: PrincipalLookup;
}

export async function createDelegation(
	deps: CreateDelegationDeps,
	input: CreateDelegationCommand,
): Promise<GovernanceCommandResult> {
	const command = createDelegationCommandSchema.parse(input);
	// ANX-466/N3 (LOW da revalidacao G4): o filho herda capability do pai; sem
	// validar o catalogo, um parent legado propaga token que o sistema nao
	// consome ("lavagem" de capability fora do catalogo). O subset continua
	// limitado ao parent — isto so' fecha a porta do catalogo.
	for (const capability of command.capabilitySubset) {
		if (!isKnownGrantCapability(capability)) {
			throwGovernanceError(
				"GOV_CAPABILITY_UNKNOWN",
				`Capability ${capability} is not in the grant capability catalog`,
			);
		}
	}
	// ANX-476/B (MEDIUM do G2) — a UNICA leitura pre-transacao e' a que
	// identifica o ESCOPO da transacao (tenant/agency/principal). Ela nao julga
	// estado mutavel: um grant revogado/vencido continua existindo, entao o
	// retry legitimo de um comando ja' commitado atravessa daqui ate' o replay.
	// As validacoes de estado (ativo, subset, janela) rodam DEPOIS do replay,
	// dentro da transacao — antes elas rodavam aqui e um retry apos a revogacao
	// do parent falhava com `GOV_GRANT_REVOKED` em vez de reproduzir o
	// resultado. Validacao de estado continua valendo para execucao NOVA.
	const parentGrant = await deps.grantRepository.findById(
		command.parentGrantId,
	);
	if (!parentGrant) {
		throwGovernanceError(
			"GOV_GRANT_NOT_FOUND",
			`Parent grant ${command.parentGrantId} not found`,
		);
	}

	const validUntil = new Date(command.validUntil);

	const tenantContext: TenantContext = {
		tenantId: parentGrant.tenantId,
		agencyId: parentGrant.agencyId,
		principalId: parentGrant.granteePrincipalId,
	};

	return deps.unitOfWork.runInTransaction(tenantContext, async (context) => {
		// ANX-476/FURO 4 — mesma key so' repete para a MESMA delegacao
		// (grant pai + delegado + subset + janela + intentHash). O subset e'
		// comparado SEM ordem (ANX-476/D: `JSON.stringify` cru devolvia 409 falso
		// para o mesmo conjunto em ordem diferente).
		const raced = await loadIdempotentCommandResult(
			context.commandJournal,
			command.commandId,
			{
				commandName: "CreateDelegation",
				matchesAggregate: async (aggregateId) => {
					const existing =
						await context.delegationRepository.findById(aggregateId);
					if (!existing) {
						return false;
					}
					return (
						existing.parentGrantId === command.parentGrantId &&
						existing.delegatePrincipalId === command.delegatePrincipalId &&
						capabilitySubsetsEqual(
							existing.capabilitySubset,
							command.capabilitySubset,
						) &&
						existing.validUntil.toISOString() === validUntil.toISOString() &&
						existing.intentHash === (command.intentHash ?? null)
					);
				},
			},
		);
		if (raced) {
			return raced;
		}

		const parent = await context.grantRepository.findById(
			command.parentGrantId,
		);
		if (!parent) {
			throwGovernanceError(
				"GOV_GRANT_NOT_FOUND",
				`Parent grant ${command.parentGrantId} not found`,
			);
		}
		if (!isGrantActive(parent)) {
			throwGovernanceError(
				"GOV_GRANT_REVOKED",
				`Parent grant ${command.parentGrantId} is not active`,
			);
		}
		if (
			!validateCapabilitySubset(parent.capability, command.capabilitySubset)
		) {
			throwGovernanceError(
				"GOV_DELEGATION_EXCEEDS_PARENT",
				"Delegation capability subset exceeds parent grant authority",
			);
		}
		if (parent.validUntil && validUntil > parent.validUntil) {
			throwGovernanceError(
				"GOV_DELEGATION_EXCEEDS_PARENT",
				"Delegation validUntil exceeds parent grant validity",
			);
		}

		const delegateExists = await deps.principalLookup.exists(
			command.delegatePrincipalId,
		);
		if (!delegateExists) {
			throwGovernanceError(
				"GOV_PRINCIPAL_NOT_FOUND",
				`Principal ${command.delegatePrincipalId} not found`,
			);
		}

		const bumpedEpoch = await context.authorityEpochStore.increment(
			parent.scopeId,
			parent.tenantId,
			parent.agencyId,
		);
		const now = new Date();
		const delegationId = randomUUID();
		const childGrantIds: string[] = [];

		for (const capability of command.capabilitySubset) {
			const grantId = randomUUID();
			childGrantIds.push(grantId);
			await context.grantRepository.save({
				id: grantId,
				tenantId: parent.tenantId,
				agencyId: parent.agencyId,
				scopeId: parent.scopeId,
				scopeKind: parent.scopeKind,
				granteePrincipalId: command.delegatePrincipalId,
				granteeAgentId: null,
				// Filho de delegation e' derivado do grant pai, nao de um emissor
				// principal: revogavel por owner/admin da agencia (ANX-469).
				issuedByPrincipalId: null,
				capability,
				resourceRef: `delegation:${delegationId}`,
				status: "active",
				validFrom: now,
				validUntil,
				derivedFromMembershipId: null,
				authorityEpochAtIssue: bumpedEpoch.epoch,
				revision: 1,
				createdAt: now,
				updatedAt: now,
			});
		}

		const delegation = await context.delegationRepository.save({
			id: delegationId,
			tenantId: parent.tenantId,
			agencyId: parent.agencyId,
			parentGrantId: parent.id,
			delegatePrincipalId: command.delegatePrincipalId,
			capabilitySubset: command.capabilitySubset,
			intentHash: command.intentHash ?? null,
			validUntil,
			status: "active",
			revision: 1,
			createdAt: now,
			updatedAt: now,
		});

		const result = governanceCommandResultSchema.parse({
			aggregateId: delegation.id,
			revision: delegation.revision,
			authorityEpoch: bumpedEpoch.epoch,
		});

		const events = [
			createDelegationCreatedEvent({
				delegationId: delegation.id,
				parentGrantId: parent.id,
				delegatePrincipalId: command.delegatePrincipalId,
				capabilitySubset: command.capabilitySubset,
				childGrantIds,
				revision: delegation.revision,
			}),
			...childGrantIds.map((grantId, index) => {
				const capability = command.capabilitySubset[index]!;
				return createGrantIssuedEvent(
					{
						grantId,
						scopeId: parent.scopeId,
						granteePrincipalId: command.delegatePrincipalId,
						capability,
						status: "active",
						authorityEpoch: bumpedEpoch.epoch,
						revision: 1,
						validFrom: now.toISOString(),
						validUntil: null,
					},
					now,
				);
			}),
			createAuthorityEpochBumpedEvent({
				scopeId: parent.scopeId,
				epoch: bumpedEpoch.epoch,
				reason: "CreateDelegation",
			}),
		];

		await recordGovernanceCommand(context, {
			commandId: command.commandId,
			commandName: "CreateDelegation",
			aggregateId: delegation.id,
			aggregateType: "Delegation",
			revision: delegation.revision,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		await context.publishEvents(events);
		return result;
	});
}
