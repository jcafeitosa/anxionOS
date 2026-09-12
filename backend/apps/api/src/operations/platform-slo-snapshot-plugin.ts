import { AppError } from "@anxionos/contracts/errors";
import { platformSloSnapshotSchema } from "@anxionos/contracts/operations";
import {
	hasPlatformConsoleGrant,
	type GrantRepository,
} from "@anxionos/governance";
import type { MetricsCollector } from "@anxionos/observability";
import { getPlatformSloSnapshot } from "@anxionos/operations";
import { Elysia } from "elysia";
import { mapOperationsError } from "./error-handler";

export interface PlatformSloSnapshotPluginDeps {
	metrics: MetricsCollector;
	grantRepository: GrantRepository;
	now?: () => string;
}

interface PlatformSloContext {
	principalId: string;
}

/**
 * Platform-scoped read model for SLO/capacity dashboard (ANX-170 S4).
 * ANX-497: Requires console.platform grant.
 */
export function createPlatformSloSnapshotPlugin(
	deps: PlatformSloSnapshotPluginDeps,
) {
	return new Elysia({ name: "platform-slo-snapshot" })
		.onError(({ error, set, request }) => {
			const mapped = mapOperationsError(
				error,
				request.headers.get("x-request-id") ?? undefined,
			);
			set.status = mapped.status;
			return mapped.body;
		})
		.resolve(async ({ request }): Promise<{ slo: PlatformSloContext }> => {
			const principalId = request.headers.get("x-principal-id");
			if (!principalId) {
				throw AppError.unauthorized();
			}
			return { slo: { principalId } };
		})
		.get(
			"/v1/operations/platform/slo-snapshot",
			async ({ slo }) => {
				const allowed = await hasPlatformConsoleGrant(
					{ grantRepository: deps.grantRepository },
					slo.principalId,
				);
				if (!allowed) {
					throw AppError.forbidden("PLATFORM console grant required");
				}
				const snapshot = getPlatformSloSnapshot({
					metrics: deps.metrics,
					now: deps.now,
				});
				return platformSloSnapshotSchema.parse(snapshot);
			},
			{
				detail: {
					tags: ["operations", "platform"],
					summary: "Platform SLO snapshot (redacted)",
					description:
						"Exports in-process API and eventing SLI metrics for the platform console. Requires console.platform grant. No tenant secrets or connection strings.",
				},
			},
		);
}
