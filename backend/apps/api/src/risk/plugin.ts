import type { TenantScopedQueryable } from "@anxionos/database";
import type { PrincipalRepository } from "@anxionos/identity";
import type { betterAuth } from "better-auth";
import { Elysia } from "elysia";
import { agencyIdParamSchema } from "../governance/handlers/grants";
import { riskOpenApi } from "../openapi-operations";
import { parseIdempotencyKey } from "../organizations/middleware/idempotency-key";
import { requireAgencyMembership } from "../organizations/middleware/require-agency-membership";
import { requireAgencyMutationRole } from "../organizations/middleware/require-agency-mutation-role";
import { resolvePrincipalFromSession } from "../organizations/resolve-principal";
import type { RiskApiRuntime } from "./bootstrap";
import { mapRiskError } from "./error-handler";
import {
	handleActivateKillSwitch,
	handleGetKillSwitchStatus,
	handleReleaseKillSwitch,
} from "./handlers/kill-switch";

export interface RiskPluginDeps extends RiskApiRuntime {
	auth: ReturnType<typeof betterAuth>;
	identityRepository: PrincipalRepository;
	scopedPool: TenantScopedQueryable;
}

function requestIdFrom(headers: Headers): string | undefined {
	return headers.get("x-request-id") ?? undefined;
}

async function resolveSessionPrincipal(deps: RiskPluginDeps, request: Request) {
	const session = await deps.auth.api.getSession({ headers: request.headers });
	if (!session?.user?.id) {
		const { AppError } = await import("@anxionos/contracts/errors");
		throw AppError.unauthorized();
	}
	const principal = await resolvePrincipalFromSession(
		deps.identityRepository,
		session.user.id,
	);
	return { session, principal };
}

export function createRiskPlugin(deps: RiskPluginDeps) {
	return new Elysia({ name: "risk", prefix: "/v1/risk" })
		.onError(({ error, set, request }) => {
			const mapped = mapRiskError(error, requestIdFrom(request.headers));
			set.status = mapped.status;
			return mapped.body;
		})
		.group("/agencies/:agencyId", (scoped) =>
			scoped
				.group("", (readRoutes) =>
					readRoutes
						.resolve(async ({ request, params }) => {
							const { agencyId } = agencyIdParamSchema.parse(params);
							const { principal } = await resolveSessionPrincipal(
								deps,
								request,
							);
							await requireAgencyMembership(
								deps.scopedPool,
								agencyId,
								principal.id,
							);
							return { principal, agencyId };
						})
						.get(
							"/kill-switch",
							({ agencyId }) => handleGetKillSwitchStatus(deps, { agencyId }),
							riskOpenApi.getKillSwitchStatus,
						),
				)
				.group("", (writeRoutes) =>
					writeRoutes
						.resolve(async ({ request, params }) => {
							const { agencyId } = agencyIdParamSchema.parse(params);
							const { principal } = await resolveSessionPrincipal(
								deps,
								request,
							);
							await requireAgencyMutationRole(
								deps.scopedPool,
								agencyId,
								principal.id,
							);
							return { principal, agencyId };
						})
						.post(
							"/kill-switch/activate",
							async ({ request, agencyId, principal }) => {
								const commandId = parseIdempotencyKey(request.headers);
								const body = await request.json();
								return handleActivateKillSwitch(deps, {
									commandId,
									agencyId,
									principalId: principal.id,
									body,
								});
							},
							riskOpenApi.activateKillSwitch,
						)
						.post(
							"/kill-switch/release",
							async ({ request, agencyId, principal }) => {
								const commandId = parseIdempotencyKey(request.headers);
								const body = await request.json();
								return handleReleaseKillSwitch(deps, {
									commandId,
									agencyId,
									principalId: principal.id,
									body,
								});
							},
							riskOpenApi.releaseKillSwitch,
						),
				),
		);
}
