import { describe, expect, test } from "bun:test";
import { adapterCommandV1Schema } from "@anxionos/contracts/adapter-gateway";
import {
	domainEventTapBridgeSchema,
	ingestDomainEventTapCommandSchema,
} from "@anxionos/contracts/audit";
import { createSubscriptionCommandSchema } from "@anxionos/contracts/billing";
import { domainEventEnvelopeV02Schema } from "@anxionos/contracts/envelope-v02";
import { recordEvaluationScoreCommandSchema } from "@anxionos/contracts/evaluation";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import { createIncidentCommandSchema } from "@anxionos/contracts/operations";
import {
	renewTaskLeaseCommandSchema,
	taskIdSchema,
} from "@anxionos/contracts/orchestration";
import { registerPartnerCommandSchema } from "@anxionos/contracts/partners";
import { recordOutcomeSnapshotCommandSchema } from "@anxionos/contracts/performance";
import { createSimulationRunCommandSchema } from "@anxionos/contracts/simulation";

const VALID_UUID = "a1234567-89ab-4def-8123-456789abcdef";
const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const V6_UUID = "6ba7b810-9dad-61d1-80b4-00c04fd430c8";
const INVALID_VARIANT = "ffffffff-ffff-ffff-ffff-ffffffffffff";

const LEDGER_LINES = [
	{
		accountCode: "CASH",
		debit: "100",
		credit: "0",
		asset: "USD",
		amount: "100",
	},
	{
		accountCode: "EQUITY",
		debit: "0",
		credit: "100",
		asset: "USD",
		amount: "100",
	},
];

describe("partners institutional UUID boundaries (ANX-444 batch 9)", () => {
	test("registerPartnerCommandSchema rejects nil commandId", () => {
		expect(
			registerPartnerCommandSchema.safeParse({
				commandId: NIL_UUID,
				organizationId: VALID_UUID,
				referralCode: "REF-001",
				displayName: "Partner Alpha",
				commissionRate: "0.10",
				referredOrganizationId: VALID_UUID,
			}).success,
		).toBe(false);
	});

	test("registerPartnerCommandSchema rejects v6+ referredOrganizationId", () => {
		expect(
			registerPartnerCommandSchema.safeParse({
				commandId: VALID_UUID,
				organizationId: VALID_UUID,
				referralCode: "REF-001",
				displayName: "Partner Alpha",
				commissionRate: "0.10",
				referredOrganizationId: V6_UUID,
			}).success,
		).toBe(false);
	});
});

describe("operations institutional UUID boundaries (ANX-444 batch 9)", () => {
	test("createIncidentCommandSchema rejects nil organizationId", () => {
		expect(
			createIncidentCommandSchema.safeParse({
				commandId: VALID_UUID,
				organizationId: NIL_UUID,
				title: "API latency spike",
				severity: "HIGH",
			}).success,
		).toBe(false);
	});
});

describe("evaluation institutional UUID boundaries (ANX-444 batch 9)", () => {
	test("recordEvaluationScoreCommandSchema rejects non-RFC variant organizationId", () => {
		expect(
			recordEvaluationScoreCommandSchema.safeParse({
				commandId: VALID_UUID,
				organizationId: INVALID_VARIANT,
				outcomeSnapshotId: "perf_out_a1234567-89ab-4def-8123-456789abcdef",
				valueDate: "2026-01-01",
				linesSummary: LEDGER_LINES,
			}).success,
		).toBe(false);
	});
});

describe("performance institutional UUID boundaries (ANX-444 batch 9)", () => {
	test("recordOutcomeSnapshotCommandSchema rejects nil commandId", () => {
		expect(
			recordOutcomeSnapshotCommandSchema.safeParse({
				commandId: NIL_UUID,
				organizationId: VALID_UUID,
				journalEntryId: "acc_jrn_a1234567-89ab-4def-8123-456789abcdef",
				valueDate: "2026-01-01",
				linesSummary: LEDGER_LINES,
			}).success,
		).toBe(false);
	});
});

describe("simulation institutional UUID boundaries (ANX-444 batch 9)", () => {
	test("createSimulationRunCommandSchema rejects v6+ organizationId", () => {
		expect(
			createSimulationRunCommandSchema.safeParse({
				commandId: VALID_UUID,
				organizationId: V6_UUID,
				executionMode: "SIMULATED",
			}).success,
		).toBe(false);
	});
});

describe("audit institutional UUID boundaries (ANX-444 batch 9)", () => {
	test("ingestDomainEventTapCommandSchema rejects nil sourceEventId", () => {
		expect(
			ingestDomainEventTapCommandSchema.safeParse({
				commandId: VALID_UUID,
				organizationId: VALID_UUID,
				sourceEventId: NIL_UUID,
				ownerDomain: "decisions",
				eventType: "decisions.intent.submitted.v1",
				occurredAt: "2026-01-01T00:00:00.000Z",
				payloadHash: "a".repeat(64),
			}).success,
		).toBe(false);
	});

	test("domainEventTapBridgeSchema rejects non-RFC variant organizationId", () => {
		expect(
			domainEventTapBridgeSchema.safeParse({
				eventId: VALID_UUID,
				ownerDomain: "decisions",
				eventType: "decisions.intent.submitted.v1",
				occurredAt: "2026-01-01T00:00:00.000Z",
				organizationId: INVALID_VARIANT,
				payloadHash: "a".repeat(64),
			}).success,
		).toBe(false);
	});
});

describe("orchestration institutional UUID boundaries (ANX-444 batch 9)", () => {
	test("renewTaskLeaseCommandSchema rejects nil leaseToken", () => {
		expect(
			renewTaskLeaseCommandSchema.safeParse({
				taskId: VALID_UUID,
				agentId: "agent-1",
				leaseToken: NIL_UUID,
			}).success,
		).toBe(false);
	});

	test("taskIdSchema rejects v6+ identifiers", () => {
		expect(taskIdSchema.safeParse(V6_UUID).success).toBe(false);
	});
});

describe("adapter-gateway institutional UUID boundaries (ANX-444 batch 9)", () => {
	test("adapterCommandV1Schema rejects nil commandId", () => {
		expect(
			adapterCommandV1Schema.safeParse({
				commandId: NIL_UUID,
				idempotencyKey: "idem-1",
				tenantId: VALID_UUID,
				agencyId: VALID_UUID,
				actorId: VALID_UUID,
				actorType: "AGENT",
				executionMode: "SIMULATED",
				adapterId: "sim-adapter",
				adapterVersion: "1.0.0",
				imageDigest: "sha256:" + "a".repeat(64),
				assetClass: "EQUITY",
				venueRef: "SIM",
				accountRef: "acct-1",
				instrumentRef: "AAPL",
				tradeIntentId: VALID_UUID,
				executionPermitId: VALID_UUID,
				permitHash: "hash-1",
				order: { side: "BUY", orderType: "MARKET", quantity: "1" },
				correlationId: VALID_UUID,
				causationId: VALID_UUID,
				createdAt: "2026-01-01T00:00:00.000Z",
				expiresAt: "2026-01-02T00:00:00.000Z",
				policyVersion: "v1",
				grantEpoch: 1,
				riskSnapshotId: "risk-1",
				requestedCapabilities: ["orderSubmit"],
			}).success,
		).toBe(false);
	});
});

describe("billing institutional UUID exceptions (ANX-444 batch 9)", () => {
	test("createSubscriptionCommandSchema still accepts nil UUID (NOT_APPLICABLE pending ANX-223)", () => {
		// Billing deferred: z.string().uuid() accepts nil; institutionalUuidSchema would reject.
		expect(
			createSubscriptionCommandSchema.safeParse({
				commandId: NIL_UUID,
				organizationId: VALID_UUID,
				planCode: "starter",
				billingPeriodStart: "2026-01-01T00:00:00.000Z",
				billingPeriodEnd: "2026-02-01T00:00:00.000Z",
			}).success,
		).toBe(true);
	});
});

describe("envelope institutional UUID boundaries (ANX-444 batch 9)", () => {
	test("domainEventEnvelopeSchema rejects nil eventId", () => {
		expect(
			domainEventEnvelopeSchema.safeParse({
				eventId: NIL_UUID,
				schemaVersion: "0.1.0",
				ownerDomain: "organizations",
				eventType: "organizations.agency.created.v1",
				occurredAt: "2026-01-01T00:00:00.000Z",
				payload: {},
			}).success,
		).toBe(false);
	});

	test("domainEventEnvelopeV02Schema rejects v6+ correlationId", () => {
		expect(
			domainEventEnvelopeV02Schema.safeParse({
				messageId: VALID_UUID,
				messageType: "organizations.agency.created.v1",
				schemaVersion: "0.2.0",
				occurredAt: "2026-01-01T00:00:00.000Z",
				correlationId: V6_UUID,
				actorPrincipalId: VALID_UUID,
				channel: "system",
				ownerDomain: "organizations",
				payload: {},
			}).success,
		).toBe(false);
	});
});
