import { institutionalUuidSchema } from "@anxionos/contracts";
import {
	isKnownGrantCapability,
	isPlatformOnlyCapability,
	issueGrantCommandSchema,
	PLATFORM_SCOPE_ID,
	revokeGrantCommandSchema,
	roleMayIssueGrantCapability,
} from "@anxionos/contracts/governance";
import type { MembershipRole } from "@anxionos/contracts/organizations";
import {
	GovernanceCommandError,
	type Grant,
	hasCapability,
	issueGrant,
	listEffectiveGrants,
	revokeGrant,
} from "@anxionos/governance";
import { z } from "zod";
import type { GovernancePluginDeps } from "../plugin";

const issueGrantBodySchema = issueGrantCommandSchema
	.omit({ commandId: true, scopeId: true })
	.strict();

const revokeGrantBodySchema = revokeGrantCommandSchema
	.omit({ commandId: true, grantId: true })
	.partial()
	.strict();

export function toGrantDto(grant: Grant) {
	return {
		id: grant.id,
		scopeId: grant.scopeId,
		granteePrincipalId: grant.granteePrincipalId,
		capability: grant.capability,
		status: grant.status,
		validFrom: grant.validFrom.toISOString(),
		validUntil: grant.validUntil?.toISOString() ?? null,
		authorityEpochAtIssue: grant.authorityEpochAtIssue,
		revision: grant.revision,
	};
}

export async function handleListGrants(
	deps: GovernancePluginDeps,
	input: { agencyId: string; principalId: string },
) {
	const grants = await listEffectiveGrants(
		{ grantRepository: deps.grantRepository },
		{ scopeId: input.agencyId, principalId: input.principalId },
	);
	return { grants: grants.map(toGrantDto) };
}

export interface IssueGrantActor {
	principalId: string;
	role: MembershipRole;
}

/**
 * ANX-466 (G5 FURO 4) — a existencia da capability e' checada **antes** de
 * qualquer decisao de autoridade. Se a posse/papel rodasse primeiro, uma
 * capability desconhecida com prefixo administrativo (`identity.superadmin`)
 * responderia 403 e vazaria o resultado da checagem de autoridade em vez do
 * 400 institucional `GOV_CAPABILITY_UNKNOWN`.
 */
function assertCapabilityInCatalog(capability: string): void {
	if (!isKnownGrantCapability(capability)) {
		throw new GovernanceCommandError(
			"GOV_CAPABILITY_UNKNOWN",
			`Capability ${capability} is not in the grant capability catalog`,
		);
	}
}

/**
 * ANX-466 — politica de emissao por papel (declarada em
 * `@anxionos/contracts/governance/grant-capability-policy`).
 *
 * A rota era autorizada apenas por papel de membership (`owner|admin|operator`)
 * e aceitava qualquer capability: um `operator` autoconcedia `identity.admin`
 * e, com esse grant, revogava globalmente o owner da propria agencia. `operator`
 * passa a emitir somente capability operacional; owner/admin seguem emitindo o
 * que a agencia comporta.
 */
function assertRoleMayIssueCapability(
	role: MembershipRole,
	capability: string,
): void {
	if (!roleMayIssueGrantCapability(role, capability)) {
		throw new GovernanceCommandError(
			"GOV_INSUFFICIENT_AUTHORITY",
			`Role ${role} cannot issue capability ${capability}`,
		);
	}
}

/**
 * ANX-466 (G5 FURO 2) — ninguem concede o que nao detem, **para qualquer
 * classe**: o grant derivado e' limitado a autoridade efetiva do emissor.
 *
 * A versao anterior dispensava a posse para capability operacional concedida a
 * terceiro; o G5 mediu o efeito (`operator` emitia `agents.skills.evaluate` /
 * `agents.budget.manage` a terceiro e o fallback de `governance-guards`
 * autorizava a operacao). Papel e' necessario, mas nao suficiente. E' o mesmo
 * invariante que `GOV_DELEGATION_EXCEEDS_PARENT` aplica a `capabilitySubset`:
 * delegacao nunca amplia autoridade.
 *
 * A posse vale no escopo da agencia ou no escopo PLATAFORMA (autoridade global
 * pode conceder para baixo).
 */
async function assertIssuerHoldsCapability(
	deps: GovernancePluginDeps,
	actor: IssueGrantActor,
	input: { capability: string; agencyId: string },
): Promise<void> {
	const repository = { grantRepository: deps.grantRepository };
	const heldInAgency = await hasCapability(repository, {
		principalId: actor.principalId,
		capability: input.capability,
		scopeId: input.agencyId,
	});
	if (heldInAgency) {
		return;
	}
	const heldInPlatform = await hasCapability(repository, {
		principalId: actor.principalId,
		capability: input.capability,
		scopeId: PLATFORM_SCOPE_ID,
	});
	if (!heldInPlatform) {
		throw new GovernanceCommandError(
			"GOV_INSUFFICIENT_AUTHORITY",
			`Issuer ${actor.principalId} does not hold capability ${input.capability} in agency ${input.agencyId} or PLATFORM scope`,
		);
	}
}

export async function handleIssueGrant(
	deps: GovernancePluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		actor: IssueGrantActor;
		body: unknown;
	},
) {
	const body = issueGrantBodySchema.parse(input.body);
	// Existencia primeiro (FURO 4): 400 institucional, sem vazar autoridade.
	assertCapabilityInCatalog(body.capability);
	// ANX-462 nao regride: capability platform-only fora do escopo de plataforma
	// continua recusada pelo proprio comando com `GOV_CAPABILITY_SCOPE_MISMATCH`
	// (409) e zero escrita — a politica de emissao por papel nao troca o codigo
	// desse caminho legado nem o deixa alcancar autorizacao.
	if (isPlatformOnlyCapability(body.capability)) {
		return issueGrant(
			{
				unitOfWork: deps.unitOfWork,
				commandJournal: deps.commandJournal,
				principalLookup: deps.principalLookup,
			},
			{
				commandId: input.commandId,
				scopeId: input.agencyId,
				...body,
			},
		);
	}
	assertRoleMayIssueCapability(input.actor.role, body.capability);
	await assertIssuerHoldsCapability(deps, input.actor, {
		capability: body.capability,
		agencyId: input.agencyId,
	});
	return issueGrant(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
			principalLookup: deps.principalLookup,
		},
		{
			commandId: input.commandId,
			scopeId: input.agencyId,
			...body,
		},
	);
}

export async function handleRevokeGrant(
	deps: GovernancePluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		grantId: string;
		body: unknown;
	},
) {
	const grant = await deps.grantRepository.findById(input.grantId);
	if (!grant || grant.scopeId !== input.agencyId) {
		throw new GovernanceCommandError(
			"GOV_GRANT_NOT_FOUND",
			`Grant ${input.grantId} not found in agency ${input.agencyId}`,
		);
	}
	const body = revokeGrantBodySchema.parse(input.body ?? {});
	return revokeGrant(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
			grantRepository: deps.grantRepository,
		},
		{
			commandId: input.commandId,
			grantId: input.grantId,
			...body,
		},
	);
}

export const agencyIdParamSchema = z.object({
	agencyId: institutionalUuidSchema,
});

export const grantIdParamSchema = z.object({
	grantId: institutionalUuidSchema,
});
