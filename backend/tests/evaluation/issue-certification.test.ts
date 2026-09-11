import { describe, expect, test } from "bun:test";
import { EVALUATION_EVENT_TYPES } from "@anxionos/contracts/evaluation";
import {
	EvaluationCommandError,
	issueCertification,
} from "@anxionos/evaluation";
import {
	createInMemoryCertificationRepository,
	createInMemoryCommandJournalRepository,
	createInMemoryEvaluationRecordRepository,
	createRecordingEvaluationUnitOfWork,
	createStubCertificationSubjectQuery,
	createStubScoringPolicyQuery,
} from "./test-support";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherOrganizationId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const strategyId = "st_str_11111111-1111-4111-8111-111111111111";
const strategyVersionId = "st_ver_22222222-2222-4222-8222-222222222222";
const policyHash = "a".repeat(64);
const evaluationRecordId = "evl_rec_33333333-3333-4333-8333-333333333333";

function createDeps(options?: {
	subjectLifecycle?: string;
	publishedPolicies?: string[];
	evaluationRecords?: Parameters<
		typeof createInMemoryEvaluationRecordRepository
	>[0];
}) {
	const commandJournal = createInMemoryCommandJournalRepository();
	const evaluationRecords = createInMemoryEvaluationRecordRepository(
		options?.evaluationRecords,
	);
	const { unitOfWork, published, certifications } =
		createRecordingEvaluationUnitOfWork({
			commandJournal,
			evaluationRecords,
		});
	return {
		deps: {
			unitOfWork,
			commandJournal,
			subjectQuery: createStubCertificationSubjectQuery([
				{
					organizationId,
					strategyId,
					strategyVersionId,
					lifecycleState: options?.subjectLifecycle ?? "EVALUATED",
				},
			]),
			scoringPolicyQuery: createStubScoringPolicyQuery(
				options?.publishedPolicies ?? [policyHash],
			),
		},
		published,
		certifications,
	};
}

describe("issueCertification (ANX-160 S3)", () => {
	test("issues certification and emits certification.issued event", async () => {
		const { deps, published, certifications } = createDeps({
			evaluationRecords: [
				{
					id: evaluationRecordId,
					organizationId,
					outcomeSnapshotId:
						"perf_out_44444444-4444-4444-8444-444444444444",
					valueDate: "2026-09-10",
					computedAt: "2026-09-10T12:00:00.000Z",
				},
			],
		});
		const result = await issueCertification(deps, {
			commandId: "55555555-5555-4555-8555-555555555555",
			organizationId,
			strategyId,
			strategyVersionId,
			evaluationRecordId,
			policyHash,
		});

		expect(result.certificationId).toMatch(/^evl_crt_/);
		expect(result.aggregateId).toBe(result.certificationId);
		expect(result.evaluationRecordId).toBe(evaluationRecordId);
		expect(result.revision).toBe(1);

		const stored = await certifications.findBySubject({
			organizationId,
			subjectType: "strategy_version",
			strategyId,
			strategyVersionId,
			policyHash,
		});
		expect(stored?.status).toBe("issued");

		const certEvent = published.find(
			(event) =>
				event.eventType === EVALUATION_EVENT_TYPES.CERTIFICATION_ISSUED,
		);
		expect(certEvent?.payload).toMatchObject({
			certificationId: result.certificationId,
			organizationId,
			subjectType: "strategy_version",
			strategyId,
			strategyVersionId,
			evaluationRecordId,
			policyHash,
		});
	});

	test("idempotent replay by commandId", async () => {
		const { deps } = createDeps();
		const commandId = "66666666-6666-4666-8666-666666666666";
		const first = await issueCertification(deps, {
			commandId,
			organizationId,
			strategyId,
			strategyVersionId,
			policyHash,
		});
		const replay = await issueCertification(deps, {
			commandId,
			organizationId,
			strategyId: "st_str_99999999-9999-4999-8999-999999999999",
			strategyVersionId: "st_ver_88888888-8888-4888-8888-888888888888",
			policyHash: "b".repeat(64),
		});

		expect(replay.idempotentReplay).toBe(true);
		expect(replay.certificationId).toBe(first.certificationId);
	});

	test("idempotent replay by subject and policyHash", async () => {
		const { deps } = createDeps();
		const first = await issueCertification(deps, {
			commandId: "77777777-7777-4777-8777-777777777777",
			organizationId,
			strategyId,
			strategyVersionId,
			policyHash,
		});
		const replay = await issueCertification(deps, {
			commandId: "88888888-8888-4888-8888-888888888888",
			organizationId,
			strategyId,
			strategyVersionId,
			policyHash,
		});

		expect(replay.idempotentReplay).toBe(true);
		expect(replay.certificationId).toBe(first.certificationId);
	});

	test("G3-EVL-02 rejects non-certifiable lifecycle", async () => {
		const { deps } = createDeps({ subjectLifecycle: "BACKTESTED" });

		await expect(
			issueCertification(deps, {
				commandId: "99999999-9999-4999-8999-999999999999",
				organizationId,
				strategyId,
				strategyVersionId,
				policyHash,
			}),
		).rejects.toMatchObject({
			code: "EVL_SUBJECT_INVALID",
		} satisfies Partial<EvaluationCommandError>);
	});

	test("rejects missing published scoring policy", async () => {
		const { deps } = createDeps({ publishedPolicies: [] });

		await expect(
			issueCertification(deps, {
				commandId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01",
				organizationId,
				strategyId,
				strategyVersionId,
				policyHash,
			}),
		).rejects.toMatchObject({
			code: "EVL_POLICY_MISSING",
		} satisfies Partial<EvaluationCommandError>);
	});

	test("rejects absent policyHash", async () => {
		const { deps } = createDeps();

		await expect(
			issueCertification(deps, {
				commandId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02",
				organizationId,
				strategyId,
				strategyVersionId,
			}),
		).rejects.toMatchObject({
			code: "EVL_POLICY_MISSING",
		} satisfies Partial<EvaluationCommandError>);
	});

	test("rejects missing evaluationRecordId when record not found (S4-C2)", async () => {
		const { deps } = createDeps();

		await expect(
			issueCertification(deps, {
				commandId: "cccccccc-cccc-4ccc-8ccc-cccccccccc01",
				organizationId,
				strategyId,
				strategyVersionId,
				evaluationRecordId,
				policyHash,
			}),
		).rejects.toMatchObject({
			code: "EVL_RECORD_NOT_FOUND",
		} satisfies Partial<EvaluationCommandError>);
	});

	test("idempotent replay ignores revoked certification (S4-C1)", async () => {
		const revokedCertificationId =
			"evl_crt_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
		const certifications = createInMemoryCertificationRepository([
			{
				id: revokedCertificationId,
				organizationId,
				subjectType: "strategy_version",
				strategyId,
				strategyVersionId,
				policyHash,
				status: "revoked",
				issuedAt: "2026-09-10T12:00:00.000Z",
				revokedAt: "2026-09-11T12:00:00.000Z",
			},
		]);
		const commandJournal = createInMemoryCommandJournalRepository();
		const { unitOfWork, published } = createRecordingEvaluationUnitOfWork({
			commandJournal,
			certifications,
		});
		const deps = {
			unitOfWork,
			commandJournal,
			subjectQuery: createStubCertificationSubjectQuery([
				{
					organizationId,
					strategyId,
					strategyVersionId,
					lifecycleState: "EVALUATED",
				},
			]),
			scoringPolicyQuery: createStubScoringPolicyQuery([policyHash]),
		};

		const result = await issueCertification(deps, {
			commandId: "cccccccc-cccc-4ccc-8ccc-cccccccccc02",
			organizationId,
			strategyId,
			strategyVersionId,
			policyHash,
		});

		expect(result.certificationId).not.toBe(revokedCertificationId);
		expect(result.idempotentReplay).toBeUndefined();
		expect(
			published.some(
				(event) =>
					event.eventType === EVALUATION_EVENT_TYPES.CERTIFICATION_ISSUED,
			),
		).toBe(true);
	});

	test("rejects cross-tenant command journal replay", async () => {
		const commandJournal = createInMemoryCommandJournalRepository([
			{
				commandId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001",
				organizationId: otherOrganizationId,
				commandName: "issueCertification",
				responseSnapshot: {
					aggregateId: "evl_crt_cccccccc-cccc-4ccc-8ccc-cccccccccccc",
					revision: 1,
					certificationId:
						"evl_crt_cccccccc-cccc-4ccc-8ccc-cccccccccccc",
				},
			},
		]);
		const { unitOfWork } = createRecordingEvaluationUnitOfWork({
			commandJournal,
		});

		await expect(
			issueCertification(
				{
					unitOfWork,
					commandJournal,
					subjectQuery: createStubCertificationSubjectQuery([
						{
							organizationId,
							strategyId,
							strategyVersionId,
							lifecycleState: "EVALUATED",
						},
					]),
					scoringPolicyQuery: createStubScoringPolicyQuery([policyHash]),
				},
				{
					commandId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001",
					organizationId,
					strategyId,
					strategyVersionId,
					policyHash,
				},
			),
		).rejects.toMatchObject({
			code: "EVL_CROSS_TENANT",
		} satisfies Partial<EvaluationCommandError>);
	});
});
