import { describe, expect, test } from "bun:test";
import {
	createPortfolioCommandSchema,
	portfolioCreatedPayloadSchema,
} from "@anxionos/contracts/portfolios";
import {
	dispatchBundleSchema,
	openExecutionSessionCommandSchema,
	reconcileUnknownCommandSchema,
	sessionOpenedPayloadSchema,
	taskLeaseSchema,
} from "@anxionos/contracts/execution";
import {
	registerStrategyCommandSchema,
	strategyRegisteredPayloadSchema,
} from "@anxionos/contracts/strategies";
import {
	activateLimitPolicyCommandSchema,
	checkCompletedPayloadSchema,
} from "@anxionos/contracts/risk";

const VALID_UUID = "a1234567-89ab-4def-8123-456789abcdef";
const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const V6_UUID = "6ba7b810-9dad-61d1-80b4-00c04fd430c8";
const INVALID_VARIANT = "ffffffff-ffff-ffff-ffff-ffffffffffff";

describe("portfolios institutional UUID boundaries (ANX-444 batch 6)", () => {
	test("createPortfolioCommandSchema rejects nil commandId", () => {
		expect(
			createPortfolioCommandSchema.safeParse({
				commandId: NIL_UUID,
				organizationId: VALID_UUID,
				ownerUserId: VALID_UUID,
				capitalAccountId: "cap_1",
				name: "Core",
				baseCurrency: "USD",
				executionMode: "SIMULATED",
			}).success,
		).toBe(false);
	});

	test("createPortfolioCommandSchema rejects v6+ organizationId", () => {
		expect(
			createPortfolioCommandSchema.safeParse({
				commandId: VALID_UUID,
				organizationId: V6_UUID,
				ownerUserId: VALID_UUID,
				capitalAccountId: "cap_1",
				name: "Core",
				baseCurrency: "USD",
				executionMode: "SIMULATED",
			}).success,
		).toBe(false);
	});

	test("portfolioCreatedPayloadSchema rejects non-RFC variant ownerUserId", () => {
		expect(
			portfolioCreatedPayloadSchema.safeParse({
				portfolioId: "pf_prt_a1234567-89ab-4def-8123-456789abcdef",
				organizationId: VALID_UUID,
				ownerUserId: INVALID_VARIANT,
				capitalAccountId: "cap_1",
				name: "Core",
				baseCurrency: "USD",
				executionMode: "SIMULATED",
			}).success,
		).toBe(false);
	});

	test("portfolioCreatedPayloadSchema accepts valid institutional UUIDs", () => {
		expect(
			portfolioCreatedPayloadSchema.safeParse({
				portfolioId: "pf_prt_a1234567-89ab-4def-8123-456789abcdef",
				organizationId: VALID_UUID,
				ownerUserId: VALID_UUID,
				capitalAccountId: "cap_1",
				name: "Core",
				baseCurrency: "USD",
				executionMode: "SIMULATED",
			}).success,
		).toBe(true);
	});
});

describe("execution institutional UUID boundaries (ANX-444 batch 6)", () => {
	test("openExecutionSessionCommandSchema rejects nil commandId", () => {
		expect(
			openExecutionSessionCommandSchema.safeParse({
				commandId: NIL_UUID,
				organizationId: VALID_UUID,
				intentHash: "intent-hash",
				riskPermitId: "rk_pmt_a1234567-89ab-4def-8123-456789abcdef",
				authorityEpoch: 1,
				riskEpoch: 1,
				executionMode: "SIMULATED",
			}).success,
		).toBe(false);
	});

	test("sessionOpenedPayloadSchema rejects v6+ organizationId", () => {
		expect(
			sessionOpenedPayloadSchema.safeParse({
				sessionId: "ex_ses_a1234567-89ab-4def-8123-456789abcdef",
				organizationId: V6_UUID,
				intentHash: "intent-hash",
				riskPermitId: "rk_pmt_a1234567-89ab-4def-8123-456789abcdef",
				authorityEpoch: 1,
				riskEpoch: 1,
				executionMode: "SIMULATED",
				venueAdapterRefId: "ex_vad_a1234567-89ab-4def-8123-456789abcdef",
			}).success,
		).toBe(false);
	});

	test("reconcileUnknownCommandSchema rejects nil orderId", () => {
		expect(
			reconcileUnknownCommandSchema.safeParse({
				orderId: NIL_UUID,
				idempotencyKey: VALID_UUID,
				venueStatusQueryId: "query-1",
				decision: "KEEP_RECONCILING",
				rationale: "awaiting venue",
			}).success,
		).toBe(false);
	});

	test("dispatchBundleSchema rejects non-RFC variant adapterId", () => {
		expect(
			dispatchBundleSchema.safeParse({
				adapterId: INVALID_VARIANT,
				accountId: VALID_UUID,
			}).success,
		).toBe(false);
	});

	test("taskLeaseSchema accepts valid institutional UUIDs", () => {
		expect(
			taskLeaseSchema.safeParse({
				leaseToken: VALID_UUID,
				holderId: VALID_UUID,
				expiresAt: "2026-09-11T12:00:00.000Z",
			}).success,
		).toBe(true);
	});
});

describe("strategies institutional UUID boundaries (ANX-444 batch 6)", () => {
	test("registerStrategyCommandSchema rejects nil commandId", () => {
		expect(
			registerStrategyCommandSchema.safeParse({
				commandId: NIL_UUID,
				organizationId: VALID_UUID,
				displayName: "Momentum",
				executionMode: "SIMULATED",
			}).success,
		).toBe(false);
	});

	test("registerStrategyCommandSchema rejects v6+ organizationId", () => {
		expect(
			registerStrategyCommandSchema.safeParse({
				commandId: VALID_UUID,
				organizationId: V6_UUID,
				displayName: "Momentum",
				executionMode: "SIMULATED",
			}).success,
		).toBe(false);
	});

	test("strategyRegisteredPayloadSchema rejects non-RFC variant organizationId", () => {
		expect(
			strategyRegisteredPayloadSchema.safeParse({
				strategyId: "st_str_a1234567-89ab-4def-8123-456789abcdef",
				organizationId: INVALID_VARIANT,
				revision: 1,
			}).success,
		).toBe(false);
	});

	test("strategyRegisteredPayloadSchema accepts valid institutional UUIDs", () => {
		expect(
			strategyRegisteredPayloadSchema.safeParse({
				strategyId: "st_str_a1234567-89ab-4def-8123-456789abcdef",
				organizationId: VALID_UUID,
				revision: 1,
			}).success,
		).toBe(true);
	});
});

describe("risk institutional UUID boundaries (ANX-444 batch 6)", () => {
	test("activateLimitPolicyCommandSchema rejects nil commandId", () => {
		expect(
			activateLimitPolicyCommandSchema.safeParse({
				commandId: NIL_UUID,
				organizationId: VALID_UUID,
				policyVersion: "v1",
				maxNotional: "1000",
				riskEpoch: 1,
			}).success,
		).toBe(false);
	});

	test("activateLimitPolicyCommandSchema rejects v6+ organizationId", () => {
		expect(
			activateLimitPolicyCommandSchema.safeParse({
				commandId: VALID_UUID,
				organizationId: V6_UUID,
				policyVersion: "v1",
				maxNotional: "1000",
				riskEpoch: 1,
			}).success,
		).toBe(false);
	});

	test("checkCompletedPayloadSchema rejects non-RFC variant organizationId", () => {
		expect(
			checkCompletedPayloadSchema.safeParse({
				checkId: "rk_chk_a1234567-89ab-4def-8123-456789abcdef",
				organizationId: INVALID_VARIANT,
				portfolioId: "pf_prt_a1234567-89ab-4def-8123-456789abcdef",
				intentHash: "intent-hash",
				checkResult: "PASS",
				notionalAmount: "100",
				authorityEpoch: 1,
				riskEpoch: 1,
				executionMode: "SIMULATED",
			}).success,
		).toBe(false);
	});

	test("checkCompletedPayloadSchema accepts valid institutional UUIDs", () => {
		expect(
			checkCompletedPayloadSchema.safeParse({
				checkId: "rk_chk_a1234567-89ab-4def-8123-456789abcdef",
				organizationId: VALID_UUID,
				portfolioId: "pf_prt_a1234567-89ab-4def-8123-456789abcdef",
				intentHash: "intent-hash",
				checkResult: "PASS",
				notionalAmount: "100",
				authorityEpoch: 1,
				riskEpoch: 1,
				executionMode: "SIMULATED",
			}).success,
		).toBe(true);
	});
});
