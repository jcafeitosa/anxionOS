import { institutionalUuidSchema } from "@anxionos/contracts";
import { AppError } from "@anxionos/contracts/errors";
import { Elysia } from "elysia";
import { identityPrincipalsOpenApi } from "../openapi-operations";
import { resolvePrincipalFromSession } from "../organizations/resolve-principal";
import type { IdentityPluginDeps } from "./deps";
import { mapIdentityError } from "./error-handler";
import {
	handleGetPrincipal,
	handleListRevokedSessions,
	handleListSessions,
	handleRegisterPrincipal,
	handleRevokePrincipal,
	handleRevokeSession,
	handleSuspendPrincipal,
} from "./handlers";

function requestIdFrom(headers: Headers): string | undefined {
	return headers.get("x-request-id") ?? undefined;
}

/** Elysia exposes request headers as a plain record; handlers expect `Headers`. */
function toHeaders(raw: Record<string, string | undefined>): Headers {
	const headers = new Headers();
	for (const [key, value] of Object.entries(raw)) {
		if (value !== undefined) {
			headers.set(key, value);
		}
	}
	return headers;
}

/**
 * Resolves the acting principal from the Better Auth session. Suspended and
 * revoked principals fail closed here because `resolvePrincipalFromSession`
 * uses the public query that only accepts ACTIVE (D-IDN-008).
 */
async function resolveRequestContext(
	deps: IdentityPluginDeps,
	request: Request,
): Promise<{ actorPrincipalId: string; agencyId?: string }> {
	const session = await deps.auth.api.getSession({ headers: request.headers });
	if (!session?.user?.id) {
		throw AppError.unauthorized("Authentication required");
	}
	const principal = await resolvePrincipalFromSession(
		deps.identityRepository,
		session.user.id,
	);
	const rawAgencyId = request.headers.get("x-agency-id");
	// Header PRESENTE com valor vazio nao e' "sem escopo": era falsy e caia no
	// mesmo ramo da ausencia, contrariando o invariante de que um header presente
	// e invalido nunca vira "sem escopo" (achado LOW NEW-3 da revalidacao G4).
	if (rawAgencyId !== null && rawAgencyId.trim() === "") {
		throw AppError.validation("x-agency-id must not be empty");
	}
	const agencyId = rawAgencyId
		? institutionalUuidSchema.parse(rawAgencyId)
		: undefined;
	return { actorPrincipalId: principal.id, agencyId };
}

/**
 * Identity HTTP boundary (R04): `/v1/identity/*`. Better Auth keeps owning
 * `/v1/auth/*` and `/api/auth/*`; this plugin never re-implements sessions.
 */
export function createIdentityPlugin(deps: IdentityPluginDeps) {
	return new Elysia({ name: "identity", prefix: "/v1/identity" })
		.onError(({ error, set, request }) => {
			const mapped = mapIdentityError(error, requestIdFrom(request.headers));
			set.status = mapped.status;
			return mapped.body;
		})
		.resolve(async ({ request }) => resolveRequestContext(deps, request))
		.get(
			"/principals/:principalId",
			({ params, actorPrincipalId, agencyId }) =>
				handleGetPrincipal(deps, { params, actorPrincipalId, agencyId }),
			identityPrincipalsOpenApi.getPrincipal,
		)
		.get(
			"/principals/:principalId/sessions",
			({ params, actorPrincipalId, agencyId }) =>
				handleListSessions(deps, { params, actorPrincipalId, agencyId }),
			identityPrincipalsOpenApi.listSessions,
		)
		.post(
			"/principals",
			({ headers, body, actorPrincipalId, agencyId }) =>
				handleRegisterPrincipal(deps, {
					headers: toHeaders(headers),
					body,
					actorPrincipalId,
					agencyId,
				}),
			identityPrincipalsOpenApi.registerPrincipal,
		)
		.post(
			"/principals/:principalId/suspend",
			({ params, headers, body, actorPrincipalId, agencyId }) =>
				handleSuspendPrincipal(deps, {
					params,
					headers: toHeaders(headers),
					body,
					actorPrincipalId,
					agencyId,
				}),
			identityPrincipalsOpenApi.suspendPrincipal,
		)
		.post(
			"/principals/:principalId/revoke",
			({ params, headers, body, actorPrincipalId, agencyId }) =>
				handleRevokePrincipal(deps, {
					params,
					headers: toHeaders(headers),
					body,
					actorPrincipalId,
					agencyId,
				}),
			identityPrincipalsOpenApi.revokePrincipal,
		)
		.post(
			"/sessions/revoke",
			({ headers, body, actorPrincipalId, agencyId }) =>
				handleRevokeSession(deps, {
					headers: toHeaders(headers),
					body,
					actorPrincipalId,
					agencyId,
				}),
			identityPrincipalsOpenApi.revokeSession,
		)
		.get(
			"/sessions/revoked",
			({ query, actorPrincipalId, agencyId }) =>
				handleListRevokedSessions(deps, {
					query,
					actorPrincipalId,
					agencyId,
				}),
			identityPrincipalsOpenApi.listRevokedSessions,
		);
}
