import { describe, expect, test } from "bun:test";
import { isEligibleForPurge } from "@anxionos/operations";

describe("isEligibleForPurge (ANX-313 S3)", () => {
	test("returns false when incident is not closed", () => {
		expect(isEligibleForPurge(null, "2026-09-10T00:00:00.000Z", 30)).toBe(
			false,
		);
	});

	test("returns false when retention window has not elapsed", () => {
		const closedAt = "2026-09-01T00:00:00.000Z";
		const now = "2026-09-10T00:00:00.000Z"; // 9 days later
		expect(isEligibleForPurge(closedAt, now, 30)).toBe(false);
	});

	test("returns true exactly at the retention boundary", () => {
		const closedAt = "2026-08-01T00:00:00.000Z";
		const now = "2026-08-31T00:00:00.000Z"; // exactly 30 days later
		expect(isEligibleForPurge(closedAt, now, 30)).toBe(true);
	});

	test("returns true well past the retention window", () => {
		const closedAt = "2026-01-01T00:00:00.000Z";
		const now = "2026-09-10T00:00:00.000Z";
		expect(isEligibleForPurge(closedAt, now, 30)).toBe(true);
	});

	test("returns false for non-positive retentionDays", () => {
		const closedAt = "2020-01-01T00:00:00.000Z";
		const now = "2026-09-10T00:00:00.000Z";
		expect(isEligibleForPurge(closedAt, now, 0)).toBe(false);
		expect(isEligibleForPurge(closedAt, now, -1)).toBe(false);
	});
});
