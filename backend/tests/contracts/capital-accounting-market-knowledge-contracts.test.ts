import { describe, expect, test } from "bun:test";
import {
	accountRegisteredPayloadSchema,
	proposeAllocationCommandSchema,
	registerCapitalAccountCommandSchema,
} from "@anxionos/contracts/capital";
import {
	executionFillConfirmedV1Schema,
	ledgerPostedPayloadSchema,
	postLedgerEntryCommandSchema,
} from "@anxionos/contracts/accounting";
import {
	connectionsMarketDataObservedSchema,
	registerInstrumentCommandSchema,
	recordObservationCommandSchema,
} from "@anxionos/contracts/market-data";
import {
	aclRefSchema,
	contextManifestSchema,
	evidenceRecordedPayloadSchema,
	registerKnowledgeSourceCommandSchema,
} from "@anxionos/contracts/knowledge";

const VALID_UUID = "a1234567-89ab-4def-8123-456789abcdef";
const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const V6_UUID = "6ba7b810-9dad-61d1-80b4-00c04fd430c8";
const INVALID_VARIANT = "ffffffff-ffff-ffff-ffff-ffffffffffff";

describe("capital institutional UUID boundaries (ANX-444 batch 7)", () => {
	test("registerCapitalAccountCommandSchema rejects nil commandId", () => {
		expect(
			registerCapitalAccountCommandSchema.safeParse({
				commandId: NIL_UUID,
				organizationId: VALID_UUID,
				ownerUserId: VALID_UUID,
				baseCurrency: "USD",
				initialSettledAmount: "1000",
				executionMode: "SIMULATED",
			}).success,
		).toBe(false);
	});

	test("proposeAllocationCommandSchema rejects v6+ grantId", () => {
		expect(
			proposeAllocationCommandSchema.safeParse({
				commandId: VALID_UUID,
				organizationId: VALID_UUID,
				accountId: "cap_acc_a1234567-89ab-4def-8123-456789abcdef",
				portfolioId: VALID_UUID,
				grantId: V6_UUID,
				limitAmount: "1000",
				limitCurrency: "USD",
				executionMode: "SIMULATED",
			}).success,
		).toBe(false);
	});

	test("accountRegisteredPayloadSchema rejects non-RFC variant ownerUserId", () => {
		expect(
			accountRegisteredPayloadSchema.safeParse({
				accountId: "cap_acc_a1234567-89ab-4def-8123-456789abcdef",
				ownerUserId: INVALID_VARIANT,
				baseCurrency: "USD",
				organizationId: VALID_UUID,
			}).success,
		).toBe(false);
	});
});

describe("accounting institutional UUID boundaries (ANX-444 batch 7)", () => {
	test("postLedgerEntryCommandSchema rejects nil organizationId", () => {
		expect(
			postLedgerEntryCommandSchema.safeParse({
				commandId: VALID_UUID,
				organizationId: NIL_UUID,
				idempotencyKey: "ledger:1",
				executionMode: "SIMULATED",
				lines: [
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
				],
			}).success,
		).toBe(false);
	});

	test("executionFillConfirmedV1Schema rejects v6+ orderId", () => {
		expect(
			executionFillConfirmedV1Schema.safeParse({
				eventId: VALID_UUID,
				organizationId: VALID_UUID,
				fillId: "fill-1",
				orderId: V6_UUID,
				side: "BUY",
				instrumentId: VALID_UUID,
				quantity: "1",
				price: "100",
				notionalAmount: "100",
				asset: "USD",
				filledAt: "2026-01-01T00:00:00.000Z",
				executionMode: "SIMULATED",
			}).success,
		).toBe(false);
	});

	test("ledgerPostedPayloadSchema rejects non-RFC variant organizationId", () => {
		expect(
			ledgerPostedPayloadSchema.safeParse({
				entryId: "acc_je_a1234567-89ab-4def-8123-456789abcdef",
				organizationId: INVALID_VARIANT,
				idempotencyKey: "ledger:1",
				entryKind: "MANUAL",
				linesSummary: [
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
				],
				valueDate: "2026-01-01",
			}).success,
		).toBe(false);
	});
});

describe("market-data institutional UUID boundaries (ANX-444 batch 7)", () => {
	test("registerInstrumentCommandSchema rejects nil commandId", () => {
		expect(
			registerInstrumentCommandSchema.safeParse({
				commandId: NIL_UUID,
				organizationId: VALID_UUID,
				canonicalSymbol: "BTC-USD",
				instrumentKind: "SPOT",
				assetId: "BTC",
				venueId: "SIM",
				executionMode: "SIMULATED",
			}).success,
		).toBe(false);
	});

	test("recordObservationCommandSchema rejects v6+ sourceEventId", () => {
		expect(
			recordObservationCommandSchema.safeParse({
				commandId: VALID_UUID,
				organizationId: VALID_UUID,
				instrumentId: "md_ins_a1234567-89ab-4def-8123-456789abcdef",
				observationKind: "TRADE",
				sourceEventId: V6_UUID,
				eventTime: "2026-01-01T00:00:00.000Z",
				price: "100",
				executionMode: "SIMULATED",
			}).success,
		).toBe(false);
	});

	test("connectionsMarketDataObservedSchema rejects non-RFC variant eventId", () => {
		expect(
			connectionsMarketDataObservedSchema.safeParse({
				eventId: INVALID_VARIANT,
				organizationId: VALID_UUID,
				observationKind: "TRADE",
				sourceEventId: VALID_UUID,
				eventTime: "2026-01-01T00:00:00.000Z",
				price: "100",
				executionMode: "SIMULATED",
			}).success,
		).toBe(false);
	});
});

describe("knowledge institutional UUID boundaries (ANX-444 batch 7)", () => {
	test("registerKnowledgeSourceCommandSchema rejects nil organizationId", () => {
		expect(
			registerKnowledgeSourceCommandSchema.safeParse({
				commandId: VALID_UUID,
				organizationId: NIL_UUID,
				displayName: "Research",
				sourceKind: "MANUAL_RESEARCH",
				defaultClassification: "INTERNAL",
				defaultAclRef: { aclId: VALID_UUID, epoch: 0 },
			}).success,
		).toBe(false);
	});

	test("aclRefSchema rejects v6+ aclId", () => {
		expect(
			aclRefSchema.safeParse({
				aclId: V6_UUID,
				epoch: 0,
			}).success,
		).toBe(false);
	});

	test("contextManifestSchema rejects non-RFC variant manifestId", () => {
		expect(
			contextManifestSchema.safeParse({
				manifestId: INVALID_VARIANT,
				organizationId: VALID_UUID,
				queryHash: "a".repeat(32),
				hits: [],
				generatedAt: "2026-01-01T00:00:00.000Z",
			}).success,
		).toBe(false);
	});

	test("evidenceRecordedPayloadSchema accepts valid institutional UUIDs", () => {
		expect(
			evidenceRecordedPayloadSchema.safeParse({
				evidenceId: "kn_evd_a1234567-89ab-4def-8123-456789abcdef",
				organizationId: VALID_UUID,
				claimTextHash: "a".repeat(32),
				provenanceKind: "MANUAL",
				sourceRefs: [{ kind: "document", refId: "doc-1" }],
				recordedAt: "2026-01-01T00:00:00.000Z",
			}).success,
		).toBe(true);
	});
});
