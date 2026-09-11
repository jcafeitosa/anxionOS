import { platformSloSnapshotSchema } from "@anxionos/contracts/operations";
import type { MetricsCollector } from "@anxionos/observability";
import { getPlatformSloSnapshot } from "@anxionos/operations";
import { Elysia } from "elysia";

export interface PlatformSloSnapshotPluginDeps {
	metrics: MetricsCollector;
	now?: () => string;
}

/** Platform-scoped read model for SLO/capacity dashboard (ANX-170 S4). */
export function createPlatformSloSnapshotPlugin(
	deps: PlatformSloSnapshotPluginDeps,
) {
	return new Elysia({ name: "platform-slo-snapshot" }).get(
		"/v1/operations/platform/slo-snapshot",
		() => {
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
					"Exports in-process API and eventing SLI metrics for the platform console. No tenant secrets or connection strings.",
			},
		},
	);
}
