import type { TenantScopedQueryable } from "@anxionos/database";
import type { PrincipalRepository } from "@anxionos/identity";
import type { betterAuth } from "better-auth";
import { Elysia } from "elysia";
import { agencyIdParamSchema } from "../governance/handlers/grants";
import { executionOpenApi } from "../openapi-operations";
import { requireAgencyMembership } from "../organizations/middleware/require-agency-membership";
import { resolvePrincipalFromSession } from "../organizations/resolve-principal";
import type { ExecutionApiRuntime } from "./bootstrap";
import { mapExecutionError } from "./error-handler";
import { handleListOrders } from "./handlers/order-queries";
import { handleListReconciliationCases } from "./handlers/reconciliation-queries";

export interface ExecutionPluginDeps extends ExecutionApiRuntime {
	auth: ReturnType<typeof betterAuth>;
	identityRepository: PrincipalRepository;
	scopedPool: TenantScopedQueryable;
}

function requestIdFrom(headers: Headers): string | undefined {
	return headers.get("x-request-id") ?? undefined;
}

async function resolveSessionPrincipal(
	deps: ExecutionPluginDeps,
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

export function createExecutionPlugin(deps: ExecutionPluginDeps) {
	return new Elysia({ name: "execution", prefix: "/v1/execution" })
		.onError(({ error, set, request }) => {
			const mapped = mapExecutionError(error, requestIdFrom(request.headers));
			set.status = mapped.status;
			return mapped.body;
		})
		.group("/agencies/:agencyId", (scoped) =>
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
					"/orders",
					({ agencyId, query }) => handleListOrders(deps, { agencyId, query }),
					executionOpenApi.listOrders,
				)
				.get(
					"/reconciliation-cases",
					({ agencyId, query }) =>
						handleListReconciliationCases(deps, { agencyId, query }),
					executionOpenApi.listReconciliationCases,
				),
		);
}
