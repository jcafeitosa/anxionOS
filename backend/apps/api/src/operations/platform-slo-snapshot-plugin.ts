import { AppError } from "@anxionos/contracts/errors";
import { platformSloSnapshotSchema } from "@anxionos/contracts/operations";
import type { GrantRepository } from "@anxionos/governance";
import type { MetricsCollector } from "@anxionos/observability";
import { getPlatformSloSnapshot } from "@anxionos/operations";
import { Elysia } from "elysia";
import { requirePlatformConsoleGrant } from "./authorization";
import { mapOperationsError } from "./error-handler";

export interface PlatformSloSnapshotPluginDeps {
	metrics: MetricsCollector;
	grantRepository: GrantRepository;
	now?: () => string;
}

interface PlatformSloContext {
	principalId: string;
}

/** Platform-scoped read model for SLO/capacity dashboard (ANX-170 S4). */
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
		.resolve(async ({ headers }): Promise<{ slo: PlatformSloContext }> => {
			const principalId = headers.get("x-principal-id");
			if (!principalId) {
				throw AppError.unauthorized();
			}
			return { slo: { principalId } };
		})
		.get(
			"/v1/operations/platform/slo-snapshot",
			async ({ slo }) => {
				await requirePlatformConsoleGrant(
					{ grantRepository: deps.grantRepository },
					{ principalId: slo.principalId },
				);
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
