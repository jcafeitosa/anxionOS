import { hasCapability } from "@anxionos/governance";
import { throwIdentityError } from "@anxionos/identity";
import type { IdentityPluginDeps } from "./deps";

/**
 * Declaring an agency you do not belong to is a cross-tenant attempt, not a
 * missing grant. It is checked even for self-access, because the declared scope
 * is part of the request's intent and silencing it weakens the cross-tenant
 * signal.
 */
async function assertAgencyMembership(
	deps: Pick<IdentityPluginDeps, "agencyScope">,
	agencyId: string | undefined,
	principalId: string,
): Promise<void> {
	if (!agencyId) {
		return;
	}
	const isMember = await deps.agencyScope.isMember(agencyId, principalId);
	if (!isMember) {
		throwIdentityError(
			"IDN_CROSS_TENANT",
			"Caller is not a member of the declared agency",
		);
	}
}

async function assertCapability(
	deps: Pick<IdentityPluginDeps, "grantRepository">,
	input: {
		principalId: string;
		capability: "identity.read" | "identity.admin";
		agencyId?: string;
	},
): Promise<void> {
	const allowed = await hasCapability(
		{ grantRepository: deps.grantRepository },
		{
			principalId: input.principalId,
			capability: input.capability,
			// Sem agencia declarada a requisicao e PLATFORM-global: `null` exige
			// autoridade sem escopo. Um grant de agencia nunca autoriza operacao
			// global (era o bypass: omitir o header degradava para "qualquer
			// escopo"). Com agencia declarada, o grant precisa cobrir ESSA
			// agencia: um grant emitido para A nao autoriza operar sob B.
			scopeId: input.agencyId ?? null,
		},
	);
	if (!allowed) {
		throwIdentityError(
			"IDN_FORBIDDEN",
			`Missing required grant: ${input.capability}`,
		);
	}
}

/**
 * R04 authorization for the identity boundary. Capabilities are checked through
 * `governance` (the grant owner); when the caller declares an agency, the grant
 * must cover **that** agency (least privilege), not any agency.
 */
export async function requireIdentityGrant(
	deps: Pick<IdentityPluginDeps, "grantRepository" | "agencyScope">,
	input: {
		principalId: string;
		capability: "identity.read" | "identity.admin";
		agencyId?: string;
	},
): Promise<void> {
	await assertAgencyMembership(deps, input.agencyId, input.principalId);
	await assertCapability(deps, input);
}

/** Self-access is allowed without a grant (ficha: `identity.principal.get (self)`). */
export async function requireSelfOrGrant(
	deps: Pick<IdentityPluginDeps, "grantRepository" | "agencyScope">,
	input: {
		actorPrincipalId: string;
		targetPrincipalId: string;
		capability: "identity.read" | "identity.admin";
		agencyId?: string;
	},
): Promise<void> {
	await assertAgencyMembership(deps, input.agencyId, input.actorPrincipalId);
	if (input.actorPrincipalId === input.targetPrincipalId) {
		return;
	}
	await assertCapability(deps, {
		principalId: input.actorPrincipalId,
		capability: input.capability,
		agencyId: input.agencyId,
	});
}
