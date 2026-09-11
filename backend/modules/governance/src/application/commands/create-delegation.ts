import { randomUUID } from "node:crypto";
import {
	type CreateDelegationCommand,
	createDelegationCommandSchema,
	type GovernanceCommandResult,
	governanceCommandResultSchema,
} from "@anxionos/contracts/governance";
import { isGrantActive } from "../../domain/entities/grant";
import {
	createAuthorityEpochBumpedEvent,
	createDelegationCreatedEvent,
	createGrantIssuedEvent,
} from "../../domain/events/governance-events";
import { validateCapabilitySubset } from "../../domain/policies/delegation-capability";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { GovernanceUnitOfWork } from "../../domain/ports/governance-unit-of-work";
import type { GrantRepository } from "../../domain/ports/grant-repository";
import type { PrincipalLookup } from "../../domain/ports/principal-lookup";
import type { TenantContext } from "../../domain/ports/tenant-context";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwGovernanceError } from "../errors";

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
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
	);
	if (replay) {
		return replay;
	}

	const parentGrant = await deps.grantRepository.findById(
		command.parentGrantId,
	);
	if (!parentGrant) {
		throwGovernanceError(
			"GOV_GRANT_NOT_FOUND",
			`Parent grant ${command.parentGrantId} not found`,
		);
	}
	if (!isGrantActive(parentGrant)) {
		throwGovernanceError(
			"GOV_GRANT_REVOKED",
			`Parent grant ${command.parentGrantId} is not active`,
		);
	}
	if (
		!validateCapabilitySubset(parentGrant.capability, command.capabilitySubset)
	) {
		throwGovernanceError(
			"GOV_DELEGATION_EXCEEDS_PARENT",
			"Delegation capability subset exceeds parent grant authority",
		);
	}

	const validUntil = new Date(command.validUntil);
	if (parentGrant.validUntil && validUntil > parentGrant.validUntil) {
		throwGovernanceError(
			"GOV_DELEGATION_EXCEEDS_PARENT",
			"Delegation validUntil exceeds parent grant validity",
		);
	}

	const tenantContext: TenantContext = {
		tenantId: parentGrant.tenantId,
		agencyId: parentGrant.agencyId,
		principalId: parentGrant.granteePrincipalId,
	};

	return deps.unitOfWork.runInTransaction(tenantContext, async (context) => {
		const raced = await context.commandJournal.findByCommandId(
			command.commandId,
		);
		if (raced) {
			return parseCommandResultSnapshot(raced.responseSnapshot);
		}

		const parent = await context.grantRepository.findById(
			command.parentGrantId,
		);
		if (!parent || !isGrantActive(parent)) {
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

		await context.commandJournal.record({
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
