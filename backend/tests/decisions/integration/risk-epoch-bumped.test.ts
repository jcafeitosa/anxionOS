import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	checkAuthority,
	createDecisionsRiskEpochBumpedConsumer,
	createDecisionsUnitOfWork,
	createPgCapitalReservationQueryAdapter,
	createPgCommandJournalRepository,
	createPgDecisionsConsumerDedupRepository,
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
const GRANT_ID = DECISIONS_TEST_GRANT_ID;
const CORRELATION_ID = DECISIONS_TEST_CORRELATION_ID;
const AUTHORITY_EPOCH = 1;
const INSTRUMENT_ID = "00000000-0000-4000-8000-000000000010";
const INTENT_HASH = "f".repeat(64);

function createDeps(pool: Parameters<typeof createDecisionsUnitOfWork>[0]) {
	return {
		unitOfWork: createDecisionsUnitOfWork(pool),
		commandJournal: createPgCommandJournalRepository(pool),
		capitalReservationQuery: createPgCapitalReservationQueryAdapter(pool),
	};
}

describe("decisions risk epoch bumped integration (ANX-150 S4)", () => {
	test("epoch consumer clears stale risk pass and blocks submit", async () => {
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
			await checkAuthority(deps, {
				commandId: randomUUID(),
				organizationId: ORG_A,
				decisionId: proposed.decisionId!,
				grantId: GRANT_ID,
				authorityEpoch: AUTHORITY_EPOCH,
				intentHash: INTENT_HASH,
			});
			const accountId = await seedCapitalAccountForTests(pool);
			await fulfillSubmitPreconditions(pool, {
				organizationId: ORG_A,
				grantId: GRANT_ID,
				intentHash: INTENT_HASH,
				authorityEpoch: AUTHORITY_EPOCH,
				accountId,
			});

			const consumerDedup = createPgDecisionsConsumerDedupRepository(pool);
			const epochConsumer = createDecisionsRiskEpochBumpedConsumer({
				unitOfWork: deps.unitOfWork,
				consumerDedup,
			});
			const eventId = randomUUID();
			const result = await epochConsumer.handle(
				{
					organizationId: ORG_A,
					previousRiskEpoch: 0,
					currentRiskEpoch: 2,
					reason: "ActivateKillSwitch",
				},
				eventId,
			);
			expect(result.invalidatedDecisionIds).toContain(proposed.decisionId);

			const preconditions = await pool.query(
				`SELECT risk_check_result FROM decisions_submit_preconditions WHERE decision_id = $1`,
				[proposed.decisionId],
			);
			expect(preconditions.rows[0]?.risk_check_result).toBeNull();

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
