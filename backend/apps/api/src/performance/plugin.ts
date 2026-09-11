import type { TenantScopedQueryable } from "@anxionos/database";
import type { PrincipalRepository } from "@anxionos/identity";
import type { betterAuth } from "better-auth";
import { Elysia } from "elysia";
import { agencyIdParamSchema } from "../governance/handlers/grants";
import { performanceOpenApi } from "../openapi-operations";
import { requireAgencyMembership } from "../organizations/middleware/require-agency-membership";
import { resolvePrincipalFromSession } from "../organizations/resolve-principal";
import type { PerformanceApiRuntime } from "./bootstrap";
import { mapPerformanceError } from "./error-handler";
import {
	handleGetOutcomeSnapshot,
	handleGetPositionExposureSnapshot,
	handleListOutcomeSnapshotMetrics,
	handleListOutcomeSnapshots,
	handleListPositionExposureSnapshotMetrics,
	handleListPositionExposureSnapshots,
	outcomeSnapshotIdParamSchema,
	positionExposureSnapshotIdParamSchema,
} from "./handlers/snapshot-queries";

export interface PerformancePluginDeps extends PerformanceApiRuntime {
	auth: ReturnType<typeof betterAuth>;
	identityRepository: PrincipalRepository;
	scopedPool: TenantScopedQueryable;
}

function requestIdFrom(headers: Headers): string | undefined {
	return headers.get("x-request-id") ?? undefined;
}

async function resolveSessionPrincipal(
	deps: PerformancePluginDeps,
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

export function createPerformancePlugin(deps: PerformancePluginDeps) {
	return new Elysia({ name: "performance", prefix: "/v1/performance" })
		.onError(({ error, set, request }) => {
			const mapped = mapPerformanceError(error, requestIdFrom(request.headers));
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
					"/outcome-snapshots",
					({ agencyId, query }) =>
						handleListOutcomeSnapshots(deps, {
							agencyId,
							query,
						}),
					performanceOpenApi.listOutcomeSnapshots,
				)
				.get(
					"/outcome-snapshots/:outcomeSnapshotId",
					({ agencyId, params }) => {
						const { outcomeSnapshotId } =
							outcomeSnapshotIdParamSchema.parse(params);
						return handleGetOutcomeSnapshot(deps, {
							agencyId,
							outcomeSnapshotId,
						});
					},
					performanceOpenApi.getOutcomeSnapshot,
				)
				.get(
					"/outcome-snapshots/:outcomeSnapshotId/metrics",
					({ agencyId, params }) => {
						const { outcomeSnapshotId } =
							outcomeSnapshotIdParamSchema.parse(params);
						return handleListOutcomeSnapshotMetrics(deps, {
							agencyId,
							outcomeSnapshotId,
						});
					},
					performanceOpenApi.listOutcomeSnapshotMetrics,
				)
				.get(
					"/position-exposure-snapshots",
					({ agencyId, query }) =>
						handleListPositionExposureSnapshots(deps, {
							agencyId,
							query,
						}),
					performanceOpenApi.listPositionExposureSnapshots,
				)
				.get(
					"/position-exposure-snapshots/:positionExposureSnapshotId",
					({ agencyId, params }) => {
						const { positionExposureSnapshotId } =
							positionExposureSnapshotIdParamSchema.parse(params);
						return handleGetPositionExposureSnapshot(deps, {
							agencyId,
							positionExposureSnapshotId,
						});
					},
					performanceOpenApi.getPositionExposureSnapshot,
				)
				.get(
					"/position-exposure-snapshots/:positionExposureSnapshotId/metrics",
					({ agencyId, params }) => {
						const { positionExposureSnapshotId } =
							positionExposureSnapshotIdParamSchema.parse(params);
						return handleListPositionExposureSnapshotMetrics(deps, {
							agencyId,
							positionExposureSnapshotId,
						});
					},
					performanceOpenApi.listPositionExposureSnapshotMetrics,
				),
		);
}
