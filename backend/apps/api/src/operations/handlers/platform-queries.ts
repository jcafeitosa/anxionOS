import type { HealthDeps } from "@anxionos/contracts";
import { AppError } from "@anxionos/contracts/errors";
import type { GrantRepository } from "@anxionos/governance";
import { hasPlatformConsoleGrant } from "@anxionos/governance";

export interface PlatformHealthSnapshot {
	source: "probeHealthDeps";
	checkedAt: string;
	stale: boolean;
	deps: HealthDeps;
}

export interface ListPlatformIncidentsResponse {
	incidents: [];
}

export interface ListPlatformRuntimesResponse {
	runtimes: [];
}

export interface ListPlatformRecoveryResponse {
	recoveryTasks: [];
}

export async function requirePlatformConsoleGrant(
	grantRepository: GrantRepository,
	principalId: string,
	asOf: Date = new Date(),
): Promise<void> {
	const allowed = await hasPlatformConsoleGrant(
		{ grantRepository },
		principalId,
		asOf,
	);
	if (!allowed) {
		throw AppError.forbidden("PLATFORM console grant required");
	}
}

export async function handleGetPlatformHealth(
	probePlatformHealth: () => Promise<HealthDeps>,
): Promise<PlatformHealthSnapshot> {
	const checkedAt = new Date().toISOString();
	const deps = await probePlatformHealth();
	const stale =
		deps.postgres !== "ok" || deps.nats !== "ok" || deps.neo4j !== "ok";
	return {
		source: "probeHealthDeps",
		checkedAt,
		stale,
		deps,
	};
}

/**
 * Platform incidents are not agency incidents. ANX-158 writes agency-scoped
 * rows; listing them here would leak tenant data. Empty collection is the
 * honest PLATFORM ledger until a platform-scoped incident store exists.
 */
export function handleListPlatformIncidents(): ListPlatformIncidentsResponse {
	return { incidents: [] };
}

/**
 * No PLATFORM runtime/quota ledger exists yet. Empty collection is honest;
 * Agency metrics must not be copied here (ANX-166 S3).
 */
export function handleListPlatformRuntimes(): ListPlatformRuntimesResponse {
	return { runtimes: [] };
}

/**
 * Recovery tasks remain agency-scoped (ANX-158). PLATFORM break-glass is not
 * executed from this console; empty collection is the honest ledger (ANX-166 S4).
 */
export function handleListPlatformRecovery(): ListPlatformRecoveryResponse {
	return { recoveryTasks: [] };
}
