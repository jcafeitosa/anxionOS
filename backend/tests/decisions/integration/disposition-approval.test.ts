import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { DECISIONS_EVENT_TYPES } from "@anxionos/contracts/decisions";
import {
	createPgCapitalReservationQueryAdapter,
	checkAuthority,
	createDecisionsUnitOfWork,
	createPgCommandJournalRepository,
	proposeDecision,
	recordApproval,
	recordDisposition,
	requestHumanApproval,
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
const INTENT_HASH = "c".repeat(64);
const PROPOSER_ID = "00000000-0000-4000-8000-000000000020";
const APPROVER_ID = "00000000-0000-4000-8000-000000000021";
const RUN_ID = "orc_run_test_001";
const OPERATION_ID = "00000000-0000-4000-8000-000000000022";

function createDeps(pool: Parameters<typeof createDecisionsUnitOfWork>[0]) {
	return {
		unitOfWork: createDecisionsUnitOfWork(pool),
		commandJournal: createPgCommandJournalRepository(pool),
		capitalReservationQuery: createPgCapitalReservationQueryAdapter(pool),
	};
}

async function proposeCheckRequest(
	deps: ReturnType<typeof createDeps>,
	organizationId = ORG_A,
) {
	const proposed = await proposeDecision(deps, {
		commandId: randomUUID(),
		organizationId,
		grantId: GRANT_ID,
		expectedAuthorityEpoch: AUTHORITY_EPOCH,
		correlationId: CORRELATION_ID,
		proposerId: PROPOSER_ID,
	});
	await checkAuthority(deps, {
		commandId: randomUUID(),
		organizationId,
		decisionId: proposed.decisionId!,
		grantId: GRANT_ID,
		authorityEpoch: AUTHORITY_EPOCH,
	});
	const waiting = await requestHumanApproval(deps, {
		commandId: randomUUID(),
		organizationId,
		decisionId: proposed.decisionId!,
		proposerId: PROPOSER_ID,
		runId: RUN_ID,
		operationId: OPERATION_ID,
	});
	return { proposed, waiting };
}

describe("decisions disposition + approval (ANX-149 S3)", () => {
	test("G3-DC-S2-05: independent approver → disposition → submitIntent", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const { proposed, waiting } = await proposeCheckRequest(deps);

			expect(waiting.waitingHuman).toBe(true);
			expect(waiting.approvalId).toMatch(/^dc_apr_/);

			const approved = await recordApproval(deps, {
				commandId: randomUUID(),
				organizationId: ORG_A,
				decisionId: proposed.decisionId!,
				approverId: APPROVER_ID,
			});
			expect(approved.approvalId).toBe(waiting.approvalId);

			const disposition = await recordDisposition(deps, {
				commandId: randomUUID(),
				organizationId: ORG_A,
				decisionId: proposed.decisionId!,
				dispositionKind: "APPROVED",
				outcome: "UPHELD",
				reason: "Independent human approval recorded",
				approverId: APPROVER_ID,
				intentHash: INTENT_HASH,
			});
			expect(disposition.dispositionId).toMatch(/^dc_dsp_/);

			const accountId = await seedCapitalAccountForTests(pool);
			await fulfillSubmitPreconditions(pool, {
				organizationId: ORG_A,
				grantId: GRANT_ID,
				intentHash: INTENT_HASH,
				authorityEpoch: AUTHORITY_EPOCH,
				accountId,
			});

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
		});
	});

	test("G3-DC-S2-05 / G5-DC-02: proposer self-approves → DC_INDEPENDENT_APPROVER_REQUIRED", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const { proposed } = await proposeCheckRequest(deps);

			await expect(
				recordApproval(deps, {
					commandId: randomUUID(),
					organizationId: ORG_A,
					decisionId: proposed.decisionId!,
					approverId: PROPOSER_ID,
				}),
			).rejects.toMatchObject({ code: "DC_INDEPENDENT_APPROVER_REQUIRED" });
		});
	});

	test("WAITING_HUMAN hook emits decisions.approval.requested.v1 with runId", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const { proposed, waiting } = await proposeCheckRequest(deps);

			const journalRows = await pool.query(
				`SELECT event_type, payload
				 FROM domain_journal
				 WHERE owner_domain = 'decisions'
				   AND event_type = $1`,
				[DECISIONS_EVENT_TYPES.APPROVAL_REQUESTED],
			);
			expect(journalRows.rowCount).toBe(1);
			expect(journalRows.rows[0]?.payload).toMatchObject({
				decisionId: proposed.decisionId,
				approvalId: waiting.approvalId,
				organizationId: ORG_A,
				proposerId: PROPOSER_ID,
				runId: RUN_ID,
				operationId: OPERATION_ID,
			});

			const outboxRows = await pool.query(
				`SELECT status FROM outbox
				 WHERE owner_domain = 'decisions'
				   AND event_type = $1`,
				[DECISIONS_EVENT_TYPES.APPROVAL_REQUESTED],
			);
			expect(outboxRows.rowCount).toBe(1);
			expect(outboxRows.rows[0]?.status).toBe("pending");
		});
	});

	test("approval path without disposition → DC_DISPOSITION_REQUIRED on submit", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const { proposed } = await proposeCheckRequest(deps);
			await recordApproval(deps, {
				commandId: randomUUID(),
				organizationId: ORG_A,
				decisionId: proposed.decisionId!,
				approverId: APPROVER_ID,
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
			).rejects.toMatchObject({ code: "DC_DISPOSITION_REQUIRED" });
		});
	});

	test("denied disposition blocks submitIntent", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const { proposed } = await proposeCheckRequest(deps);
			await recordApproval(deps, {
				commandId: randomUUID(),
				organizationId: ORG_A,
				decisionId: proposed.decisionId!,
				approverId: APPROVER_ID,
			});
			await recordDisposition(deps, {
				commandId: randomUUID(),
				organizationId: ORG_A,
				decisionId: proposed.decisionId!,
				dispositionKind: "DENIED",
				outcome: "OVERTURNED",
				reason: "Human rejected trade",
				approverId: APPROVER_ID,
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
			).rejects.toMatchObject({ code: "DC_APPROVAL_REQUIRED" });
		});
	});

	test("G3-DC-S2-03: cross-tenant replay on requestHumanApproval → DC_CROSS_TENANT", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const proposed = await proposeDecision(deps, {
				commandId: randomUUID(),
				organizationId: ORG_A,
				grantId: GRANT_ID,
				expectedAuthorityEpoch: AUTHORITY_EPOCH,
				correlationId: CORRELATION_ID,
				proposerId: PROPOSER_ID,
			});
			await checkAuthority(deps, {
				commandId: randomUUID(),
				organizationId: ORG_A,
				decisionId: proposed.decisionId!,
				grantId: GRANT_ID,
				authorityEpoch: AUTHORITY_EPOCH,
			});
			const commandId = randomUUID();
			await requestHumanApproval(deps, {
				commandId,
				organizationId: ORG_A,
				decisionId: proposed.decisionId!,
				proposerId: PROPOSER_ID,
			});

			await expect(
				requestHumanApproval(deps, {
					commandId,
					organizationId: ORG_B,
					decisionId: proposed.decisionId!,
					proposerId: PROPOSER_ID,
				}),
			).rejects.toMatchObject({ code: "DC_CROSS_TENANT" });
		});
	});

	test("recordDisposition emits decisions.disposition.recorded.v1", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withDecisionsPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const { proposed } = await proposeCheckRequest(deps);
			await recordApproval(deps, {
				commandId: randomUUID(),
				organizationId: ORG_A,
				decisionId: proposed.decisionId!,
				approverId: APPROVER_ID,
			});
			const disposition = await recordDisposition(deps, {
				commandId: randomUUID(),
				organizationId: ORG_A,
				decisionId: proposed.decisionId!,
				dispositionKind: "APPROVED",
				outcome: "UPHELD",
				reason: "Approved for simulated execution",
				approverId: APPROVER_ID,
				intentHash: INTENT_HASH,
			});

			const journalRows = await pool.query(
				`SELECT payload FROM domain_journal
				 WHERE owner_domain = 'decisions'
				   AND event_type = $1`,
				[DECISIONS_EVENT_TYPES.DISPOSITION_RECORDED],
			);
			expect(journalRows.rowCount).toBe(1);
			expect(journalRows.rows[0]?.payload).toMatchObject({
				decisionId: proposed.decisionId,
				dispositionId: disposition.dispositionId,
				dispositionKind: "APPROVED",
				intentHash: INTENT_HASH,
			});
		});
	});
});
