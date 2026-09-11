import type { TenantScopedQueryable } from "@anxionos/database";
import type { PrincipalRepository } from "@anxionos/identity";
import type { betterAuth } from "better-auth";
import { Elysia } from "elysia";
import { agencyIdParamSchema } from "../governance/handlers/grants";
import { strategiesOpenApi } from "../openapi-operations";
import { parseIdempotencyKey } from "../organizations/middleware/idempotency-key";
import { requireAgencyMutationRole } from "../organizations/middleware/require-agency-mutation-role";
import { resolvePrincipalFromSession } from "../organizations/resolve-principal";
import type { StrategiesApiRuntime } from "./bootstrap";
import { mapStrategiesError } from "./error-handler";
import {
	backtestRunIdParamSchema,
	handleActivateDeployment,
	handleCompleteBacktest,
	handleCreateStrategyVersion,
	handleEmitSignal,
	handlePublishStrategyVersion,
	handleRegisterStrategy,
	handleRequestBacktest,
	strategyIdParamSchema,
	strategyVersionIdParamSchema,
} from "./handlers/commands";

export interface StrategiesPluginDeps extends StrategiesApiRuntime {
	auth: ReturnType<typeof betterAuth>;
	identityRepository: PrincipalRepository;
	scopedPool: TenantScopedQueryable;
}

function requestIdFrom(headers: Headers): string | undefined {
	return headers.get("x-request-id") ?? undefined;
}

async function resolveSessionPrincipal(
	deps: StrategiesPluginDeps,
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

export function createStrategiesPlugin(deps: StrategiesPluginDeps) {
	return new Elysia({ name: "strategies", prefix: "/v1/strategies" })
		.onError(({ error, set, request }) => {
			const mapped = mapStrategiesError(error, requestIdFrom(request.headers));
			set.status = mapped.status;
			return mapped.body;
		})
		.group("/agencies/:agencyId", (scoped) =>
			scoped
				.resolve(async ({ request, params }) => {
					const { agencyId } = agencyIdParamSchema.parse(params);
					const { principal } = await resolveSessionPrincipal(deps, request);
					await requireAgencyMutationRole(
						deps.scopedPool,
						agencyId,
						principal.id,
					);
					return { principal, agencyId };
				})
				.post(
					"",
					async ({ request, agencyId }) => {
						const commandId = parseIdempotencyKey(request.headers);
						const body = await request.json();
						return handleRegisterStrategy(deps, {
							commandId,
							agencyId,
							body,
						});
					},
					strategiesOpenApi.register,
				)
				.post(
					"/:strategyId/versions",
					async ({ request, agencyId, params }) => {
						const { strategyId } = strategyIdParamSchema.parse(params);
						const commandId = parseIdempotencyKey(request.headers);
						const body = await request.json();
						return handleCreateStrategyVersion(deps, {
							commandId,
							agencyId,
							strategyId,
							body,
						});
					},
					strategiesOpenApi.createVersion,
				)
				.post(
					"/:strategyId/versions/:strategyVersionId/publish",
					async ({ request, agencyId, params }) => {
						const { strategyId } = strategyIdParamSchema.parse(params);
						const { strategyVersionId } =
							strategyVersionIdParamSchema.parse(params);
						const commandId = parseIdempotencyKey(request.headers);
						const body =
							request.headers.get("content-length") === "0"
								? {}
								: await request.json();
						return handlePublishStrategyVersion(deps, {
							commandId,
							agencyId,
							strategyId,
							strategyVersionId,
							body,
						});
					},
					strategiesOpenApi.publish,
				)
				.post(
					"/:strategyId/versions/:strategyVersionId/backtests",
					async ({ request, agencyId, params }) => {
						const { strategyId } = strategyIdParamSchema.parse(params);
						const { strategyVersionId } =
							strategyVersionIdParamSchema.parse(params);
						const commandId = parseIdempotencyKey(request.headers);
						const body = await request.json();
						return handleRequestBacktest(deps, {
							commandId,
							agencyId,
							strategyId,
							strategyVersionId,
							body,
						});
					},
					strategiesOpenApi.requestBacktest,
				)
				.post(
					"/backtest-runs/:backtestRunId/complete",
					async ({ request, agencyId, params }) => {
						const { backtestRunId } = backtestRunIdParamSchema.parse(params);
						const commandId = parseIdempotencyKey(request.headers);
						const body =
							request.headers.get("content-length") === "0"
								? {}
								: await request.json();
						return handleCompleteBacktest(deps, {
							commandId,
							agencyId,
							backtestRunId,
							body,
						});
					},
					strategiesOpenApi.completeBacktest,
				)
				.post(
					"/:strategyId/deployments",
					async ({ request, agencyId, params }) => {
						const { strategyId } = strategyIdParamSchema.parse(params);
						const commandId = parseIdempotencyKey(request.headers);
						const body = await request.json();
						return handleActivateDeployment(deps, {
							commandId,
							agencyId,
							strategyId,
							body,
						});
					},
					strategiesOpenApi.activateDeployment,
				)
				.post(
					"/:strategyId/signals",
					async ({ request, agencyId, params }) => {
						const { strategyId } = strategyIdParamSchema.parse(params);
						const commandId = parseIdempotencyKey(request.headers);
						const body = await request.json();
						return handleEmitSignal(deps, {
							commandId,
							agencyId,
							strategyId,
							body,
						});
					},
					strategiesOpenApi.emitSignal,
				),
		);
}
