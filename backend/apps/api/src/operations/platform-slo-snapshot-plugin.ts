import { AppError } from "@anxionos/contracts/errors";
import { platformSloSnapshotSchema } from "@anxionos/contracts/operations";
import {
	hasPlatformConsoleGrant,
	type GrantRepository,
} from "@anxionos/governance";
import type { PrincipalRepository } from "@anxionos/identity";
import type { MetricsCollector } from "@anxionos/observability";
import { getPlatformSloSnapshot } from "@anxionos/operations";
import type { betterAuth } from "better-auth";
import { Elysia } from "elysia";
import { resolvePrincipalFromSession } from "../organizations/resolve-principal";
import { mapOperationsError } from "./error-handler";

export interface PlatformSloSnapshotPluginDeps {
	metrics: MetricsCollector;
	grantRepository: GrantRepository;
	auth: ReturnType<typeof betterAuth>;
	identityRepository: PrincipalRepository;
	now?: () => string;
}

interface PlatformSloContext {
	principalId: string;
}

/**
 * Platform-scoped read model for SLO/capacity dashboard (ANX-170 S4).
 * ANX-497: Requires real session (Better Auth) + console.platform grant.
 * Maya criterion 1: x-principal-id header alone is spoofable and rejected.
 */
async function resolveSessionPrincipal(
	deps: PlatformSloSnapshotPluginDeps,
	request: Request,
) {
	const session = await deps.auth.api.getSession({ headers: request.headers });
	if (!session?.user?.id) {
		throw AppError.unauthorized();
	}
	const principal = await resolvePrincipalFromSession(
		deps.identityRepository,
		session.user.id,
	);
	return { session, principal };
}

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
			const { principal } = await resolveSessionPrincipal(deps, request);
			return { slo: { principalId: principal.id } };
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
