import { describe, expect, test } from "bun:test";
import {
	decisionScopeSchema,
	decisionEngineStatusSchema,
	decisionStatusSchema,
	decisionIdSchema,
	proposalIdSchema,
	decisionRecordSchema,
} from "@anxionos/contracts/decisions";

const ISO_NOW = "2026-09-10T14:30:00.000Z";
const ISO_GRANTED = "2026-09-01T00:00:00.000Z";

function buildValidRecord(overrides: Record<string, unknown> = {}) {
	return {
		recordId: "d1234567-89ab-4def-8123-456789abcdef",
		schemaVersion: "decision-record.v1",
		scope: "engineering",
		status: "PROPOSED",
		title: "Deploy new trading algorithm",
		rationale: "Performance improvements detected",
		references: {
			decisionId: "dc_dec_123e4567-e89b-12d3-a456-426614174000",
			proposalId: "dc_prp_123e4567-e89b-12d3-a456-426614174000",
		},
		evidence: [
			{
				id: "a1234567-89ab-4def-8123-456789abcdef",
				source: "on_chain",
				uri: "https://chain.example.com/tx/abc123",
				checksum: "sha256:abc123def456",
				claim: "On-chain confirmation received",
			},
		],
		alternatives: [],
		affectedEntities: [
			{
				id: "entity-1",
				kind: "proposal",
				scopeId: "scope-1",
				role: "primary",
			},
		],
		authorityRequirement: {
			level: "L2",
			reason: "Trading algorithm changes require manager approval",
		},
		authorityReferences: [
			{
				id: "b1234567-89ab-4def-8123-456789abcdef",
				kind: "governance",
				minimumEpochs: 1,
				grantedBy: "CTO",
				grantedAt: ISO_GRANTED,
			},
		],
		approvals: [],
		disposition: undefined,
		createdAt: ISO_NOW,
		updatedAt: ISO_NOW,
		...overrides,
	};
}

describe("Decision Engine delta narrow schemas", () => {
	test("decisionScopeSchema accepts product and engineering only", () => {
		expect(decisionScopeSchema.safeParse("product").success).toBe(true);
		expect(decisionScopeSchema.safeParse("engineering").success).toBe(true);
		expect(decisionScopeSchema.safeParse("invalid").success).toBe(false);
	});

	test("decisionEngineStatusSchema accepts engine statuses", () => {
		for (const status of ["PROPOSED", "AUTHORITY_CHECKED", "SUBMITTED", "EXECUTING", "COMPLETED", "CANCELLED"]) {
			expect(decisionEngineStatusSchema.safeParse(status).success).toBe(true);
		}
		expect(decisionEngineStatusSchema.safeParse("invalid").success).toBe(false);
	});

	test("legacy decisionStatusSchema remains unchanged", () => {
		for (const status of ["PROPOSED", "AUTHORITY_CHECKED", "SUBMITTED"]) {
			expect(decisionStatusSchema.safeParse(status).success).toBe(true);
		}
		expect(decisionStatusSchema.safeParse("EXECUTING").success).toBe(false);
	});

	test("decision and proposal identifiers preserve existing formats", () => {
		expect(decisionIdSchema.safeParse("dc_dec_123e4567-e89b-12d3-a456-426614174000").success).toBe(true);
		expect(proposalIdSchema.safeParse("dc_prp_123e4567-e89b-12d3-a456-426614174000").success).toBe(true);
		expect(decisionIdSchema.safeParse("invalid-id").success).toBe(false);
		expect(proposalIdSchema.safeParse("invalid-id").success).toBe(false);
	});
});

describe("Decision Record envelope schemas", () => {
	test("decisionRecordSchema accepts valid envelope", () => {
		expect(decisionRecordSchema.safeParse(buildValidRecord()).success).toBe(true);
	});

	test("decisionRecordSchema accepts JSON wire payload with ISO datetimes", () => {
		const payload = JSON.stringify(buildValidRecord());
		expect(decisionRecordSchema.safeParse(JSON.parse(payload)).success).toBe(true);
	});

	test("decisionRecordSchema rejects invalid status", () => {
		expect(decisionRecordSchema.safeParse(buildValidRecord({ status: "invalid-status" })).success).toBe(false);
	});

	test("decisionRecordSchema rejects evidence without uri or checksum", () => {
		expect(
			decisionRecordSchema.safeParse(
				buildValidRecord({
					evidence: [
						{
							id: "a1234567-89ab-4def-8123-456789abcdef",
							source: "on_chain",
							claim: "Missing uri and checksum",
						},
					],
				}),
			).success,
		).toBe(false);
	});

	test("decisionRecordSchema rejects secrets or tokens in evidence claim", () => {
		expect(
			decisionRecordSchema.safeParse(
				buildValidRecord({
					evidence: [
						{
							id: "a1234567-89ab-4def-8123-456789abcdef",
							source: "on_chain",
							uri: "https://chain.example.com/tx/abc123",
							checksum: "sha256:abc123def456",
							claim: "Contains secret: API_KEY=abc123def456",
						},
					],
				}),
			).success,
		).toBe(false);
	});

	test("decisionRecordSchema rejects secrets or tokens in evidence uri", () => {
		expect(
			decisionRecordSchema.safeParse(
				buildValidRecord({
					evidence: [
						{
							id: "a1234567-89ab-4def-8123-456789abcdef",
							source: "on_chain",
							uri: "https://chain.example.com/tx/abc123?api_key=leaked-secret-value",
							checksum: "sha256:abc123def456",
							claim: "On-chain confirmation received",
						},
					],
				}),
			).success,
		).toBe(false);
	});

	test("decisionRecordSchema rejects secrets or tokens in evidence checksum", () => {
		expect(
			decisionRecordSchema.safeParse(
				buildValidRecord({
					evidence: [
						{
							id: "a1234567-89ab-4def-8123-456789abcdef",
							source: "on_chain",
							uri: "https://chain.example.com/tx/abc123",
							checksum: "sha256:token=leaked-secret-value",
							claim: "On-chain confirmation received",
						},
					],
				}),
			).success,
		).toBe(false);
	});

	test("decisionRecordSchema rejects empty evidence array", () => {
		expect(decisionRecordSchema.safeParse(buildValidRecord({ evidence: [] })).success).toBe(false);
	});
});
