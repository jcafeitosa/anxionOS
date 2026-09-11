import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { DECISIONS_EVENT_TYPES } from "@anxionos/contracts/decisions";
import {
	checkAuthority,
	createDecisionsUnitOfWork,
	createPgCapitalReservationQueryAdapter,
	createPgCommandJournalRepository,
	proposeDecision,
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
const INTENT_HASH = "a".repeat(64);

function createDeps(pool: Parameters<typeof createDecisionsUnitOfWork>[0]) {
	return {
		unitOfWork: createDecisionsUnitOfWork(pool),
		commandJournal: createPgCommandJournalRepository(pool),
		capitalReservationQuery: createPgCapitalReservationQueryAdapter(pool),
	};
}

async function proposeAndCheck(
	deps: ReturnType<typeof createDeps>,
	organizationId = ORG_A,
) {
	const proposed = await proposeDecision(deps, {
		commandId: randomUUID(),
		organizationId,
		grantId: GRANT_ID,
		expectedAuthorityEpoch: AUTHORITY_EPOCH,
		correlationId: CORRELATION_ID,
		proposalKind: "TRADE",
	});
	const checked = await checkAuthority(deps, {
		commandId: randomUUID(),
		organizationId,
		decisionId: proposed.decisionId!,
		grantId: GRANT_ID,
		authorityEpoch: AUTHORITY_EPOCH,
		intentHash: INTENT_HASH,
	});
	return { proposed, checked };
}

async function fulfillForSubmit(
	pool: Parameters<typeof createDecisionsUnitOfWork>[0],
) {
	const accountId = await seedCapitalAccountForTests(pool);
	await fulfillSubmitPreconditions(pool, {
		organizationId: ORG_A,
		grantId: GRANT_ID,
		intentHash: INTENT_HASH,
		authorityEpoch: AUTHORITY_EPOCH,
		accountId,
	});
}


describe("decisions lifecycle commands (ANX-149 S2)", () => {
	test("G3-DC-S2-01: propose → checkAuthority → submitIntent happy path", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const { proposed, checked } = await proposeAndCheck(deps);

			expect(proposed.decisionId).toMatch(/^dc_dec_/);
			expect(proposed.proposalId).toMatch(/^dc_prp_/);
			expect(checked.revision).toBe(2);
			await fulfillForSubmit(pool);

			const submitted = await submitIntent(deps, {
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

			expect(submitted.intentId).toMatch(/^dc_int_/);
			expect(submitted.revision).toBe(4);

			const decisionRow = await pool.query(
				`SELECT status, revision FROM decisions_records WHERE id = $1`,
				[proposed.decisionId],
			);
			expect(decisionRow.rows[0]?.status).toBe("SUBMITTED");
			expect(decisionRow.rows[0]?.revision).toBe(4);
		});
	});

	test("G3-DC-S2-01: invalid lifecycle — submit without AUTHORITY_CHECKED → DC_AUTHORITY_STALE", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const proposed = await proposeDecision(deps, {
				commandId: randomUUID(),
				organizationId: ORG_A,
				grantId: GRANT_ID,
				expectedAuthorityEpoch: AUTHORITY_EPOCH,
				correlationId: CORRELATION_ID,
			});

			await expect(
				submitIntent(deps, {
					commandId: randomUUID(),
					organizationId: ORG_A,
					decisionId: proposed.decisionId!,
					intentHash: INTENT_HASH,
					instrumentId: INSTRUMENT_ID,
					side: "BUY",
					quantity: "1.0",
					price: "100.0",
					executionMode: "SIMULATED",
				}),
			).rejects.toMatchObject({ code: "DC_AUTHORITY_STALE" });
		});
	});

	test("G3-DC-S2-04: stale authority epoch on checkAuthority → DC_AUTHORITY_STALE", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const proposed = await proposeDecision(deps, {
				commandId: randomUUID(),
				organizationId: ORG_A,
				grantId: GRANT_ID,
				expectedAuthorityEpoch: AUTHORITY_EPOCH,
				correlationId: CORRELATION_ID,
			});

			await expect(
				checkAuthority(deps, {
					commandId: randomUUID(),
					organizationId: ORG_A,
					decisionId: proposed.decisionId!,
					grantId: GRANT_ID,
					authorityEpoch: AUTHORITY_EPOCH + 1,
				}),
			).rejects.toMatchObject({ code: "DC_AUTHORITY_STALE" });
		});
	});

	test("G3-DC-S2-02: post-SUBMITTED checkAuthority → DC_INTENT_IMMUTABLE", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const { proposed } = await proposeAndCheck(deps);
			await fulfillForSubmit(pool);
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

			await expect(
				checkAuthority(deps, {
					commandId: randomUUID(),
					organizationId: ORG_A,
					decisionId: proposed.decisionId!,
					grantId: GRANT_ID,
					authorityEpoch: AUTHORITY_EPOCH,
				}),
			).rejects.toMatchObject({ code: "DC_INTENT_IMMUTABLE" });
		});
	});

	test("G3-DC-S2-02: duplicate submitIntent → DC_INTENT_IMMUTABLE", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const { proposed } = await proposeAndCheck(deps);
			await fulfillForSubmit(pool);
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

			await expect(
				submitIntent(deps, {
					commandId: randomUUID(),
					organizationId: ORG_A,
					decisionId: proposed.decisionId!,
					intentHash: "b".repeat(64),
					instrumentId: INSTRUMENT_ID,
					side: "SELL",
					quantity: "2.0",
					price: "200.0",
					executionMode: "SIMULATED",
				}),
			).rejects.toMatchObject({ code: "DC_INTENT_IMMUTABLE" });
		});
	});

	test("G3-DC-S2-03: idempotent replay returns same aggregate without duplicate side effects", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const commandId = randomUUID();

			const first = await proposeDecision(deps, {
				commandId,
				organizationId: ORG_A,
				grantId: GRANT_ID,
				expectedAuthorityEpoch: AUTHORITY_EPOCH,
				correlationId: CORRELATION_ID,
			});
			const replay = await proposeDecision(deps, {
				commandId,
				organizationId: ORG_A,
				grantId: GRANT_ID,
				expectedAuthorityEpoch: AUTHORITY_EPOCH,
				correlationId: CORRELATION_ID,
			});

			expect(replay).toMatchObject({
				decisionId: first.decisionId,
				proposalId: first.proposalId,
				idempotentReplay: true,
			});

			const decisionCount = await pool.query(
				`SELECT COUNT(*)::int AS count FROM decisions_records WHERE organization_id = $1`,
				[ORG_A],
			);
			expect(decisionCount.rows[0]?.count).toBe(1);
		});
	});

	test("G3-DC-S2-03: cross-tenant commandId replay → DC_CROSS_TENANT", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const commandId = randomUUID();

			await proposeDecision(deps, {
				commandId,
				organizationId: ORG_A,
				grantId: GRANT_ID,
				expectedAuthorityEpoch: AUTHORITY_EPOCH,
				correlationId: CORRELATION_ID,
			});

			await expect(
				proposeDecision(deps, {
					commandId,
					organizationId: ORG_B,
					grantId: GRANT_ID,
					expectedAuthorityEpoch: AUTHORITY_EPOCH,
					correlationId: CORRELATION_ID,
				}),
			).rejects.toMatchObject({ code: "DC_CROSS_TENANT" });

			const orgBDecisions = await pool.query(
				`SELECT id FROM decisions_records WHERE organization_id = $1`,
				[ORG_B],
			);
			expect(orgBDecisions.rowCount).toBe(0);
		});
	});

	test("G3-DC-S2-01: submitIntent emits decisions.intent.submitted.v1 atomically", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const { proposed } = await proposeAndCheck(deps);
			await fulfillForSubmit(pool);

			const submitted = await submitIntent(deps, {
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

			const journalRows = await pool.query(
				`SELECT event_type, payload
				 FROM domain_journal
				 WHERE owner_domain = 'decisions'
				   AND event_type = $1`,
				[DECISIONS_EVENT_TYPES.INTENT_SUBMITTED],
			);
			expect(journalRows.rowCount).toBe(1);
			expect(journalRows.rows[0]?.payload).toMatchObject({
				decisionId: proposed.decisionId,
				intentId: submitted.intentId,
				organizationId: ORG_A,
				intentHash: INTENT_HASH,
				executionMode: "SIMULATED",
			});

			const outboxRows = await pool.query(
				`SELECT event_id, status
				 FROM outbox
				 WHERE owner_domain = 'decisions'
				   AND event_type = $1`,
				[DECISIONS_EVENT_TYPES.INTENT_SUBMITTED],
			);
			expect(outboxRows.rowCount).toBe(1);
			expect(outboxRows.rows[0]?.status).toBe("pending");
		});
	});

	test("G3-DC-S2-06: submit after arming without risk pass → DC_SUBMIT_PRECONDITION", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const { proposed } = await proposeAndCheck(deps);

			await expect(
				submitIntent(deps, {
					commandId: randomUUID(),
					organizationId: ORG_A,
					decisionId: proposed.decisionId!,
					intentHash: INTENT_HASH,
					instrumentId: INSTRUMENT_ID,
					side: "BUY",
					quantity: "1.0",
					price: "100.0",
					executionMode: "SIMULATED",
				}),
			).rejects.toMatchObject({ code: "DC_SUBMIT_PRECONDITION" });
		});
	});
});
