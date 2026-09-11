import type { Pool, PoolClient } from "pg";
import { createPgCertificationRepository } from "./persistence/certification-repository";
import {
	createPgEvaluationRecordRepository,
	createPgEvaluationScoreRepository,
} from "./persistence/repositories";

export function createEvaluationDb(pool: Pool | PoolClient) {
	return {
		certifications: createPgCertificationRepository(pool),
		evaluationRecords: createPgEvaluationRecordRepository(pool),
		evaluationScores: createPgEvaluationScoreRepository(pool),
	};
}
