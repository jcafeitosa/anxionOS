import { describe, expect, test } from "bun:test";
import { EVALUATION_ERROR_CODES } from "@anxionos/contracts/evaluation";
import { EvaluationCommandError } from "@anxionos/evaluation";
import { mapEvaluationError } from "../../apps/api/src/evaluation/error-handler";
import { evaluationRecordIdParamSchema } from "../../apps/api/src/evaluation/handlers/record-queries";
import { createEvaluationPlugin } from "../../apps/api/src/evaluation/plugin";

describe("evaluation API boundary (ANX-160 S4)", () => {
	test("mapEvaluationError maps EVL_RECORD_NOT_FOUND to 404", () => {
		const error = new EvaluationCommandError(
			EVALUATION_ERROR_CODES.RECORD_NOT_FOUND,
			"evaluation record not found",
		);
		const mapped = mapEvaluationError(error);
		expect(mapped.status).toBe(404);
		expect(mapped.body.error.details).toEqual({
			code: EVALUATION_ERROR_CODES.RECORD_NOT_FOUND,
		});
	});

	test("mapEvaluationError maps EVL_CROSS_TENANT to 403", () => {
		const error = new EvaluationCommandError(
			EVALUATION_ERROR_CODES.CROSS_TENANT,
			"organization mismatch",
		);
		const mapped = mapEvaluationError(error);
		expect(mapped.status).toBe(403);
	});

	test("evaluationRecordId param schema rejects tampered ids", () => {
		expect(
			evaluationRecordIdParamSchema.safeParse({ evaluationRecordId: "bad" })
				.success,
		).toBe(false);
		expect(
			evaluationRecordIdParamSchema.safeParse({
				evaluationRecordId: "evl_rec_11111111-1111-4111-8111-111111111111",
			}).success,
		).toBe(true);
	});
});

describe("evaluation plugin routes (ANX-160 S4)", () => {
	test("registers certification and record read routes plus issue mutation", () => {
		const plugin = createEvaluationPlugin({
			auth: { api: { getSession: async () => null } } as never,
			identityRepository: {} as never,
			scopedPool: {} as never,
			unitOfWork: {} as never,
			commandJournal: {} as never,
			certifications: {} as never,
			evaluationRecords: {} as never,
			evaluationScores: {} as never,
			subjectQuery: {} as never,
			scoringPolicyQuery: {} as never,
		});
		const routes = plugin.routes.map((route) => `${route.method} ${route.path}`);
		expect(routes).toContain(
			"GET /v1/evaluation/agencies/:agencyId/certifications",
		);
		expect(routes).toContain(
			"GET /v1/evaluation/agencies/:agencyId/evaluation-records/:evaluationRecordId",
		);
		expect(routes).toContain(
			"GET /v1/evaluation/agencies/:agencyId/evaluation-records/:evaluationRecordId/score",
		);
		expect(routes).toContain(
			"POST /v1/evaluation/agencies/:agencyId/certifications",
		);
	});
});
