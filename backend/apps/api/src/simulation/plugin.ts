import type { TenantScopedQueryable } from "@anxionos/database";
import type { PrincipalRepository } from "@anxionos/identity";
import type { betterAuth } from "better-auth";
import { Elysia } from "elysia";
import { agencyIdParamSchema } from "../governance/handlers/grants";
import { simulationOpenApi } from "../openapi-operations";
import { requireAgencyMembership } from "../organizations/middleware/require-agency-membership";
import { resolvePrincipalFromSession } from "../organizations/resolve-principal";
import type { SimulationApiRuntime } from "./bootstrap";
import { mapSimulationError } from "./error-handler";
import {
	handleGetSimulationRun,
	handleGetSimulationRunSnapshot,
	handleListSimulationRuns,
	simulationRunIdParamSchema,
} from "./handlers/run-queries";

export interface SimulationPluginDeps extends SimulationApiRuntime {
	auth: ReturnType<typeof betterAuth>;
	identityRepository: PrincipalRepository;
	scopedPool: TenantScopedQueryable;
}

function requestIdFrom(headers: Headers): string | undefined {
	return headers.get("x-request-id") ?? undefined;
}

async function resolveSessionPrincipal(
	deps: SimulationPluginDeps,
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

export function createSimulationPlugin(deps: SimulationPluginDeps) {
	return new Elysia({ name: "simulation", prefix: "/v1/simulation" })
		.onError(({ error, set, request }) => {
			const mapped = mapSimulationError(error, requestIdFrom(request.headers));
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
					"/runs",
					({ agencyId, query }) =>
						handleListSimulationRuns(deps, {
							agencyId,
							query,
						}),
					simulationOpenApi.listSimulationRuns,
				)
				.get(
					"/runs/:simulationRunId",
					({ agencyId, params }) => {
						const { simulationRunId } =
							simulationRunIdParamSchema.parse(params);
						return handleGetSimulationRun(deps, {
							agencyId,
							simulationRunId,
						});
					},
					simulationOpenApi.getSimulationRun,
				)
				.get(
					"/runs/:simulationRunId/snapshot",
					({ agencyId, params }) => {
						const { simulationRunId } =
							simulationRunIdParamSchema.parse(params);
						return handleGetSimulationRunSnapshot(deps, {
							agencyId,
							simulationRunId,
						});
					},
					simulationOpenApi.getSimulationRunSnapshot,
				),
		);
}
