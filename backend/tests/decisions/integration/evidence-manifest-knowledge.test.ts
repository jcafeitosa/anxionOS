import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { DECISIONS_EVENT_TYPES } from "@anxionos/contracts/decisions";
import {
	checkAuthority,
	createDecisionsUnitOfWork,
	createKnowledgeEvidenceRecordedConsumer,
	createPgCapitalReservationQueryAdapter,
	createPgCommandJournalRepository,
	proposeDecision,
	recordEvidenceManifest,
	submitIntent,
} from "@anxionos/decisions";
import {
	DECISIONS_TEST_CORRELATION_ID,
	DECISIONS_TEST_GRANT_ID,
	DECISIONS_TEST_ORG_ID,
	fulfillSubmitPreconditions,
	seedCapitalAccountForTests,
	shouldRunPgIntegrationTests,
	withDecisionsPgHarness,
} from "../test-support";

const ORG_A = DECISIONS_TEST_ORG_ID;
const ORG_B = "00000000-0000-4000-8000-000000000001";
const GRANT_ID = DECISIONS_TEST_GRANT_ID;
const CORRELATION_ID = DECISIONS_TEST_CORRELATION_ID;
const AUTHORITY_EPOCH = 1;
const INSTRUMENT_ID = "00000000-0000-4000-8000-000000000010";
const INTENT_HASH = "e".repeat(64);
const CLAIM_HASH = "f".repeat(64);

function createDeps(pool: Parameters<typeof createDecisionsUnitOfWork>[0]) {
	return {
		unitOfWork: createDecisionsUnitOfWork(pool),
		commandJournal: createPgCommandJournalRepository(pool),
		capitalReservationQuery: createPgCapitalReservationQueryAdapter(pool),
	};
}

function evidenceId(suffix: string) {
	return `kn_evd_${suffix.padStart(8, "0")}-4000-8000-0000-000000000001`;
}

async function proposeCheck(
	deps: ReturnType<typeof createDeps>,
	organizationId = ORG_A,
) {
	const proposed = await proposeDecision(deps, {
		commandId: randomUUID(),
		organizationId,
		grantId: GRANT_ID,
		expectedAuthorityEpoch: AUTHORITY_EPOCH,
		correlationId: CORRELATION_ID,
	});
	await checkAuthority(deps, {
		commandId: randomUUID(),
		organizationId,
		decisionId: proposed.decisionId!,
		grantId: GRANT_ID,
		authorityEpoch: AUTHORITY_EPOCH,
		intentHash: INTENT_HASH,
	});
	return proposed;
}

describe("decisions evidence manifest + knowledge consumer (ANX-149 S5)", () => {
	test("recordEvidenceManifest attaches refs and emits manifest event", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const proposed = await proposeCheck(deps);
			const priorRevision = (
				await pool.query(
					"SELECT revision FROM decisions_records WHERE id = $1",
					[proposed.decisionId],
				)
			).rows[0].revision;

			const recorded = await recordEvidenceManifest(deps, {
				commandId: randomUUID(),
				organizationId: ORG_A,
				decisionId: proposed.decisionId!,
				entries: [
					{
						evidenceId: evidenceId("00000001"),
						claimTextHash: CLAIM_HASH,
						provenanceKind: "DOCUMENT",
					},
				],
			});

			expect(recorded.evidenceManifestId).toMatch(/^dc_emf_/);
			const manifest = await pool.query(
				"SELECT manifest_hash, entry_count FROM decisions_evidence_manifests WHERE decision_id = $1",
				[proposed.decisionId],
			);
			expect(Number(manifest.rows[0].entry_count)).toBe(1);
			expect(String(manifest.rows[0].manifest_hash)).toHaveLength(64);

			const outbox = await pool.query(
				`SELECT event_type FROM outbox
				 WHERE payload->>'decisionId' = $1
				   AND event_type = $2`,
				[proposed.decisionId, DECISIONS_EVENT_TYPES.EVIDENCE_MANIFEST_RECORDED],
			);
			expect(outbox.rowCount).toBe(1);

			const afterRevision = (
				await pool.query(
					"SELECT revision FROM decisions_records WHERE id = $1",
					[proposed.decisionId],
				)
			).rows[0].revision;
			expect(afterRevision).toBe(priorRevision);
		});
	});

	test("G3-DC-S5-01: knowledge consumer ignores decision already SUBMITTED", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const proposed = await proposeCheck(deps);
			const accountId = await seedCapitalAccountForTests(pool);
			await fulfillSubmitPreconditions(pool, {
				organizationId: ORG_A,
				grantId: GRANT_ID,
				intentHash: INTENT_HASH,
				authorityEpoch: AUTHORITY_EPOCH,
				accountId,
			});
			await submitIntent(deps, {
				commandId: randomUUID(),
				organizationId: ORG_A,
				decisionId: proposed.decisionId!,
				intentHash: INTENT_HASH,
				instrumentId: INSTRUMENT_ID,
				side: "BUY",
				quantity: "1.0",
				price: "100.0",
				executionMode: "SIMULATED",
			});

			const consumer = createKnowledgeEvidenceRecordedConsumer(deps);
			const eventId = randomUUID();
			const result = await consumer.handle(
				{
					evidenceId: evidenceId("00000002"),
					organizationId: ORG_A,
					claimTextHash: CLAIM_HASH,
					provenanceKind: "RETRIEVAL",
					sourceRefs: [
						{ kind: "decision", refId: proposed.decisionId! },
					],
					recordedAt: new Date().toISOString(),
				},
				eventId,
			);

			expect(result).toMatchObject({
				decisionId: proposed.decisionId,
				ignored: true,
			});
			const entries = await pool.query(
				"SELECT COUNT(*)::int AS count FROM decisions_evidence_manifest_entries WHERE decision_id = $1",
				[proposed.decisionId],
			);
			expect(entries.rows[0].count).toBe(0);
		});
	});

	test("knowledge consumer is idempotent by knowledge event id", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const proposed = await proposeCheck(deps);
			const consumer = createKnowledgeEvidenceRecordedConsumer(deps);
			const eventId = randomUUID();
			const payload = {
				evidenceId: evidenceId("00000003"),
				organizationId: ORG_A,
				claimTextHash: CLAIM_HASH,
				provenanceKind: "MANUAL" as const,
				sourceRefs: [{ kind: "decision" as const, refId: proposed.decisionId! }],
				recordedAt: new Date().toISOString(),
			};

			const first = await consumer.handle(payload, eventId);
			expect(first).toMatchObject({ evidenceManifestId: expect.stringMatching(/^dc_emf_/) });

			const second = await consumer.handle(payload, eventId);
			expect(second).toMatchObject({
				decisionId: proposed.decisionId,
				ignored: true,
				idempotentReplay: true,
			});

			const entries = await pool.query(
				"SELECT COUNT(*)::int AS count FROM decisions_evidence_manifest_entries WHERE decision_id = $1",
				[proposed.decisionId],
			);
			expect(entries.rows[0].count).toBe(1);
		});
	});

	test("knowledge consumer rejects cross-tenant organization mismatch", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const proposed = await proposeCheck(deps);
			const consumer = createKnowledgeEvidenceRecordedConsumer(deps);

			await expect(
				consumer.handle(
					{
						evidenceId: evidenceId("00000004"),
						organizationId: ORG_B,
						claimTextHash: CLAIM_HASH,
						provenanceKind: "DOCUMENT",
						sourceRefs: [
							{ kind: "decision", refId: proposed.decisionId! },
						],
						recordedAt: new Date().toISOString(),
					},
					randomUUID(),
				),
			).rejects.toMatchObject({ code: "DC_CROSS_TENANT" });
		});
	});

	test("recordEvidenceManifest rejects cross-tenant command journal replay", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const proposed = await proposeCheck(deps);
			const commandId = randomUUID();

			await recordEvidenceManifest(deps, {
				commandId,
				organizationId: ORG_A,
				decisionId: proposed.decisionId!,
				entries: [
					{
						evidenceId: evidenceId("00000005"),
						claimTextHash: CLAIM_HASH,
						provenanceKind: "DOCUMENT",
					},
				],
			});

			await expect(
				recordEvidenceManifest(deps, {
					commandId,
					organizationId: ORG_B,
					decisionId: proposed.decisionId!,
					entries: [
						{
							evidenceId: evidenceId("00000006"),
							claimTextHash: CLAIM_HASH,
							provenanceKind: "DOCUMENT",
						},
					],
				}),
			).rejects.toMatchObject({ code: "DC_CROSS_TENANT" });
		});
	});
});
