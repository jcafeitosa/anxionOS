import { describe, expect, test } from "bun:test";
import {
	computeBackoffDelay,
	DEFAULT_RETRY_POLICY,
	shouldRetry,
} from "@anxionos/eventing/retry";

describe("eventing retry policy", () => {
	test("computes capped exponential backoff", () => {
		expect(computeBackoffDelay(1)).toBe(250);
		expect(computeBackoffDelay(2)).toBe(500);
		expect(computeBackoffDelay(10)).toBe(DEFAULT_RETRY_POLICY.maxDelayMs);
	});

	test("shouldRetry respects maxAttempts", () => {
		expect(shouldRetry(1)).toBe(true);
		expect(shouldRetry(DEFAULT_RETRY_POLICY.maxAttempts)).toBe(false);
	});
});
