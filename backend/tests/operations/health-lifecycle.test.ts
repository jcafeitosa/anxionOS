import { describe, expect, test } from "bun:test";
import {
	DEFAULT_HEALTH_STALE_THRESHOLD_MS,
} from "@anxionos/contracts/operations";
import {
	deriveHealthStatusFromProbeOutcome,
	isCheckedAtMonotonic,
	isHealthCheckStale,
	runHealthProbeWithTimeout,
} from "@anxionos/operations";

describe("health lifecycle domain (ANX-310 S1)", () => {
	test("deriveHealthStatusFromProbeOutcome maps ok/error/timeout", () => {
		expect(deriveHealthStatusFromProbeOutcome("ok")).toBe("HEALTHY");
		expect(deriveHealthStatusFromProbeOutcome("error")).toBe("UNHEALTHY");
		expect(deriveHealthStatusFromProbeOutcome("timeout")).toBe("DEGRADED");
	});

	test("isCheckedAtMonotonic rejects stale timestamps", () => {
		expect(
			isCheckedAtMonotonic(
				"2026-09-10T12:00:00.000Z",
				"2026-09-10T12:00:01.000Z",
			),
		).toBe(true);
		expect(
			isCheckedAtMonotonic(
				"2026-09-10T12:00:01.000Z",
				"2026-09-10T12:00:00.000Z",
			),
		).toBe(false);
	});

	test("isHealthCheckStale flags snapshots beyond threshold", () => {
		const checkedAt = "2026-09-10T12:00:00.000Z";
		const freshNow = "2026-09-10T12:00:30.000Z";
		const staleNow = "2026-09-10T12:02:00.000Z";
		expect(
			isHealthCheckStale(checkedAt, freshNow, DEFAULT_HEALTH_STALE_THRESHOLD_MS),
		).toBe(false);
		expect(
			isHealthCheckStale(checkedAt, staleNow, DEFAULT_HEALTH_STALE_THRESHOLD_MS),
		).toBe(true);
	});

	test("runHealthProbeWithTimeout surfaces timeout and error outcomes", async () => {
		const ok = await runHealthProbeWithTimeout(async () => undefined, 50);
		expect(ok.outcome).toBe("ok");

		const timeout = await runHealthProbeWithTimeout(
			() => new Promise<void>(() => {}),
			20,
		);
		expect(timeout.outcome).toBe("timeout");
		expect(timeout.timedOut).toBe(true);

		const error = await runHealthProbeWithTimeout(async () => {
			throw new Error("dependency down");
		}, 50);
		expect(error.outcome).toBe("error");
		expect(error.message).toBe("dependency down");
	});
});
