import { describe, expect, test } from "bun:test";
import {
	aiAccountRegisteredPayloadSchema,
	grantRefSchema,
	inferenceRequestIdSchema,
	invokeInferenceCommandSchema,
	registerAIAccountCommandSchema,
} from "@anxionos/contracts/connections";

const VALID_UUID = "a1234567-89ab-4def-8123-456789abcdef";
const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const V6_UUID = "6ba7b810-9dad-61d1-80b4-00c04fd430c8";
const INVALID_VARIANT = "ffffffff-ffff-ffff-ffff-ffffffffffff";

describe("connections institutional UUID boundaries (ANX-444 batch 8)", () => {
	test("registerAIAccountCommandSchema rejects nil commandId", () => {
		expect(
			registerAIAccountCommandSchema.safeParse({
				commandId: NIL_UUID,
				organizationId: VALID_UUID,
				ownerPrincipalId: VALID_UUID,
				providerId: "openai",
				displayName: "Dev account",
			}).success,
		).toBe(false);
	});

	test("registerAIAccountCommandSchema rejects v6+ organizationId", () => {
		expect(
			registerAIAccountCommandSchema.safeParse({
				commandId: VALID_UUID,
				organizationId: V6_UUID,
				ownerPrincipalId: VALID_UUID,
				providerId: "openai",
				displayName: "Dev account",
			}).success,
		).toBe(false);
	});

	test("grantRefSchema rejects non-RFC variant grantId", () => {
		expect(
			grantRefSchema.safeParse({
				grantId: INVALID_VARIANT,
				epoch: 1,
			}).success,
		).toBe(false);
	});

	test("inferenceRequestIdSchema rejects nil UUID", () => {
		expect(inferenceRequestIdSchema.safeParse(NIL_UUID).success).toBe(false);
	});

	test("invokeInferenceCommandSchema rejects nil idempotencyKey", () => {
		expect(
			invokeInferenceCommandSchema.safeParse({
				commandId: VALID_UUID,
				bindingId: "binding-1",
				bindingVersion: 1,
				operation: "complete",
				requirements: { maxLatencyMs: 5000 },
				typedInput: {},
				deadline: "2026-12-31T23:59:59.000Z",
				idempotencyKey: NIL_UUID,
			}).success,
		).toBe(false);
	});

	test("aiAccountRegisteredPayloadSchema accepts valid institutional UUIDs", () => {
		expect(
			aiAccountRegisteredPayloadSchema.safeParse({
				aiAccountId: "acct-1",
				ownerPrincipalId: VALID_UUID,
				providerId: "openai",
				organizationId: VALID_UUID,
			}).success,
		).toBe(true);
	});
});
