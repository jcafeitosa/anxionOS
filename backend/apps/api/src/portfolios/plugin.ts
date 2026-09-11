import type { TenantScopedQueryable } from "@anxionos/database";
import type { PrincipalRepository } from "@anxionos/identity";
import type { betterAuth } from "better-auth";
import { Elysia } from "elysia";
import { agencyIdParamSchema } from "../governance/handlers/grants";
import { portfoliosOpenApi } from "../openapi-operations";
import { requireAgencyMembership } from "../organizations/middleware/require-agency-membership";
import { resolvePrincipalFromSession } from "../organizations/resolve-principal";
import type { PortfoliosApiRuntime } from "./bootstrap";
import { mapPortfoliosError } from "./error-handler";
import { handleListAgencyPortfolios } from "./handlers/overview";

export interface PortfoliosPluginDeps extends PortfoliosApiRuntime {
	auth: ReturnType<typeof betterAuth>;
	identityRepository: PrincipalRepository;
	scopedPool: TenantScopedQueryable;
}

function requestIdFrom(headers: Headers): string | undefined {
	return headers.get("x-request-id") ?? undefined;
}

async function resolveSessionPrincipal(
	deps: PortfoliosPluginDeps,
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

export function createPortfoliosPlugin(deps: PortfoliosPluginDeps) {
	return new Elysia({ name: "portfolios", prefix: "/v1/agencies" })
		.onError(({ error, set, request }) => {
			const mapped = mapPortfoliosError(error, requestIdFrom(request.headers));
			set.status = mapped.status;
			return mapped.body;
		})
		.group("/:agencyId/portfolios", (scoped) =>
			scoped
				.resolve(async ({ request, params }) => {
					const { agencyId } = agencyIdParamSchema.parse(params);
					const { principal } = await resolveSessionPrincipal(deps, request);
					await requireAgencyMembership(
						deps.scopedPool,
						agencyId,
						principal.id,
					);
					return { principal, agencyId };
				})
				.get(
					"",
					({ agencyId }) => handleListAgencyPortfolios(deps, { agencyId }),
					portfoliosOpenApi.listAgencyPortfolios,
				),
		);
}
