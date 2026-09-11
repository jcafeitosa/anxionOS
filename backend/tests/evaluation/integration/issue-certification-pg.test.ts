import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { EVALUATION_EVENT_TYPES } from "@anxionos/contracts/evaluation";
import {
	createEvaluationUnitOfWork,
	createPgCommandJournalRepository,
	type IssueCertificationDeps,
	issueCertification,
} from "@anxionos/evaluation";
import {
	createStubCertificationSubjectQuery,
	createStubScoringPolicyQuery,
	EVALUATION_TEST_ORG_ID,
	shouldRunPgIntegrationTests,
	withEvaluationPgHarness,
} from "../test-support";

const strategyId = "st_str_11111111-1111-4111-8111-111111111111";
const strategyVersionId = "st_ver_22222222-2222-4222-8222-222222222222";
const policyHash = "a".repeat(64);

function createIssueDeps(
	unitOfWork: IssueCertificationDeps["unitOfWork"],
	commandJournal: IssueCertificationDeps["commandJournal"],
): IssueCertificationDeps {
	return {
		unitOfWork,
		commandJournal,
		subjectQuery: createStubCertificationSubjectQuery([
			{
				organizationId: EVALUATION_TEST_ORG_ID,
				strategyId,
				strategyVersionId,
				lifecycleState: "EVALUATED",
			},
		]),
		scoringPolicyQuery: createStubScoringPolicyQuery([policyHash]),
	};
}

describe("issueCertification PG integration (ANX-160 S3)", () => {
	test("G3-EVL-02: persists certification, journal and outbox atomically", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withEvaluationPgHarness(
			async ({ pool, unitOfWork, commandJournal }) => {
				const commandId = randomUUID();
				const deps = createIssueDeps(unitOfWork, commandJournal);
				const result = await issueCertification(deps, {
					commandId,
					organizationId: EVALUATION_TEST_ORG_ID,
					strategyId,
					strategyVersionId,
					policyHash,
				});

				expect(result.certificationId).toMatch(/^evl_crt_/);

				const certification = await pool.query(
					`SELECT organization_id, subject_type, strategy_id, strategy_version_id, policy_hash, status
				 FROM evaluation_certifications
				 WHERE id = $1`,
					[result.certificationId],
				);
				expect(certification.rowCount).toBe(1);
				expect(certification.rows[0]?.organization_id).toBe(
					EVALUATION_TEST_ORG_ID,
				);
				expect(certification.rows[0]?.subject_type).toBe("strategy_version");
				expect(certification.rows[0]?.status).toBe("issued");
				expect(certification.rows[0]?.policy_hash).toBe(policyHash);

				const journal = await pool.query(
					`SELECT command_name
				 FROM evaluation_command_journal
				 WHERE command_id = $1`,
					[commandId],
				);
				expect(journal.rowCount).toBe(1);
				expect(journal.rows[0]?.command_name).toBe("issueCertification");

				const domainJournal = await pool.query(
					`SELECT event_type
				 FROM domain_journal
				 WHERE event_type = $1`,
					[EVALUATION_EVENT_TYPES.CERTIFICATION_ISSUED],
				);
				expect(domainJournal.rowCount).toBe(1);

				const outbox = await pool.query(
					`SELECT status
				 FROM outbox
				 WHERE event_type = $1`,
					[EVALUATION_EVENT_TYPES.CERTIFICATION_ISSUED],
				);
				expect(outbox.rowCount).toBe(1);
				expect(outbox.rows[0]?.status).toBe("pending");
			},
		);
	});

	test("G3-EVL-02 replay: duplicate subject+policy does not duplicate rows", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withEvaluationPgHarness(
			async ({ pool, unitOfWork, commandJournal }) => {
				const deps = createIssueDeps(unitOfWork, commandJournal);
				const first = await issueCertification(deps, {
					commandId: randomUUID(),
					organizationId: EVALUATION_TEST_ORG_ID,
					strategyId,
					strategyVersionId,
					policyHash,
				});
				const second = await issueCertification(deps, {
					commandId: randomUUID(),
					organizationId: EVALUATION_TEST_ORG_ID,
					strategyId,
					strategyVersionId,
					policyHash,
				});

				expect(second.idempotentReplay).toBe(true);
				expect(second.certificationId).toBe(first.certificationId);

				const certifications = await pool.query(
					`SELECT COUNT(*)::int AS count FROM evaluation_certifications`,
				);
				expect(certifications.rows[0]?.count).toBe(1);
			},
		);
	});
});
