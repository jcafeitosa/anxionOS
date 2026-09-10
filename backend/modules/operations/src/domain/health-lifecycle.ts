import type {
	HealthProbeOutcome,
	OperationsHealthStatus,
	ServiceHealthProbeDetails,
} from "@anxionos/contracts/operations";
import {
	DEFAULT_HEALTH_STALE_THRESHOLD_MS,
	serviceHealthProbeDetailsSchema,
} from "@anxionos/contracts/operations";

export interface HealthProbeExecutionResult {
	outcome: HealthProbeOutcome;
	durationMs: number;
	message?: string;
	timedOut?: boolean;
}

export function deriveHealthStatusFromProbeOutcome(
	outcome: HealthProbeOutcome,
): OperationsHealthStatus {
	switch (outcome) {
		case "ok":
			return "HEALTHY";
		case "error":
			return "UNHEALTHY";
		case "timeout":
			return "DEGRADED";
		default: {
			const _exhaustive: never = outcome;
			return _exhaustive;
		}
	}
}

export function buildServiceHealthProbeDetails(
	result: HealthProbeExecutionResult,
): ServiceHealthProbeDetails {
	return serviceHealthProbeDetailsSchema.parse({
		origin: "probe",
		outcome: result.outcome,
		durationMs: result.durationMs,
		message: result.message,
		timedOut: result.timedOut ?? result.outcome === "timeout",
	});
}

export function isCheckedAtMonotonic(
	existingCheckedAt: string,
	incomingCheckedAt: string,
): boolean {
	return Date.parse(incomingCheckedAt) >= Date.parse(existingCheckedAt);
}

export function isHealthCheckStale(
	checkedAt: string,
	nowIso: string,
	staleThresholdMs = DEFAULT_HEALTH_STALE_THRESHOLD_MS,
): boolean {
	return Date.parse(nowIso) - Date.parse(checkedAt) > staleThresholdMs;
}

export async function runHealthProbeWithTimeout(
	probe: () => Promise<void>,
	timeoutMs: number,
): Promise<HealthProbeExecutionResult> {
	const startedAt = Date.now();
	let timedOut = false;
	try {
		await Promise.race([
			probe(),
			new Promise<never>((_, reject) => {
				setTimeout(() => {
					timedOut = true;
					reject(new Error("health probe timeout"));
				}, timeoutMs);
			}),
		]);
		return {
			outcome: "ok",
			durationMs: Date.now() - startedAt,
		};
	} catch (error) {
		const durationMs = Date.now() - startedAt;
		if (timedOut) {
			return {
				outcome: "timeout",
				durationMs,
				message: "probe exceeded timeout",
				timedOut: true,
			};
		}
		const message =
			error instanceof Error ? error.message : "probe failed";
		return {
			outcome: "error",
			durationMs,
			message,
		};
	}
}
