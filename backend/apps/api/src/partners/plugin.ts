import type { TenantScopedQueryable } from "@anxionos/database";
import type { PrincipalRepository } from "@anxionos/identity";
import type {
	CommissionAccrualRepository,
	PartnerRepository,
	PayoutRepository,
} from "@anxionos/partners";
import type { betterAuth } from "better-auth";
import { Elysia } from "elysia";
import { partnersOpenApi } from "../openapi-operations";
import { mapPartnersError } from "./error-handler";
import {
	handleGetPartnerByOrganization,
	handleListCommissionAccruals,
	handleListPayouts,
} from "./handlers/read";
import { requireAgencyMembership } from "../organizations/middleware/require-agency-membership";
import { resolvePrincipalFromSession } from "../organizations/resolve-principal";

export interface PartnersPluginDeps {
	auth: ReturnType<typeof betterAuth>;
	partners: PartnerRepository;
	commissionAccruals: CommissionAccrualRepository;
	payouts: PayoutRepository;
	identityRepository: PrincipalRepository;
	scopedPool: TenantScopedQueryable;
}

function requestIdFrom(headers: Headers): string | undefined {
	return headers.get("x-request-id") ?? undefined;
}

async function resolveSessionPrincipal(
	deps: PartnersPluginDeps,
	request: Request,
) {
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

export function createPartnersPlugin(deps: PartnersPluginDeps) {
	return new Elysia({ name: "partners", prefix: "/v1/partners" })
		.onError(({ error, set, request }) => {
			const mapped = mapPartnersError(error, requestIdFrom(request.headers));
			set.status = mapped.status;
			return mapped.body;
		})
		.group("/organizations/:organizationId", (scoped) =>
			scoped
				.resolve(async ({ request, params }) => {
					const { principal } = await resolveSessionPrincipal(deps, request);
					await requireAgencyMembership(
						deps.scopedPool,
						params.organizationId,
						principal.id,
					);
					return { principal, organizationId: params.organizationId };
				})
				.get(
					"",
					async ({ organizationId }) =>
						handleGetPartnerByOrganization(deps, { organizationId }),
					partnersOpenApi.getByOrganization,
				)
				.get(
					"/commission-accruals",
					async ({ organizationId, query }) =>
						handleListCommissionAccruals(deps, {
							organizationId,
							query,
						}),
					partnersOpenApi.listAccruals,
				)
				.get(
					"/payouts",
					async ({ organizationId, query }) =>
						handleListPayouts(deps, {
							organizationId,
							query,
						}),
					partnersOpenApi.listPayouts,
				),
		);
}
