import { hasCapability } from "@anxionos/governance";
import { throwIdentityError } from "@anxionos/identity";
import type { IdentityPluginDeps } from "./deps";

/**
 * R04 authorization for the identity boundary.
 *
 * Capabilities are checked through `governance` (the grant owner). When the
 * caller declares an agency scope, membership is required first: a principal is
 * global (D-IDN-023), so acting "as" an agency you do not belong to is a
 * cross-tenant attempt, not a missing grant.
 */
export async function requireIdentityGrant(
	deps: Pick<IdentityPluginDeps, "grantRepository" | "agencyScope">,
	input: {
		principalId: string;
		capability: "identity.read" | "identity.admin";
		agencyId?: string;
	},
): Promise<void> {
	if (input.agencyId) {
		const isMember = await deps.agencyScope.isMember(
			input.agencyId,
			input.principalId,
		);
		if (!isMember) {
			throwIdentityError(
				"IDN_CROSS_TENANT",
				"Caller is not a member of the declared agency",
			);
		}
	}
	const allowed = await hasCapability(
		{ grantRepository: deps.grantRepository },
		{
			principalId: input.principalId,
			capability: input.capability,
			// Quando o chamador declara uma agencia, o grant precisa cobrir ESSA
			// agencia: um grant emitido para A nao autoriza operar sob B.
			scopeId: input.agencyId,
		},
	);
	if (!allowed) {
		throwIdentityError(
			"IDN_FORBIDDEN",
			`Missing required grant: ${input.capability}`,
		);
	}
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
	if (input.actorPrincipalId === input.targetPrincipalId) {
		return;
	}
	await requireIdentityGrant(deps, {
		principalId: input.actorPrincipalId,
		capability: input.capability,
		agencyId: input.agencyId,
	});
}
