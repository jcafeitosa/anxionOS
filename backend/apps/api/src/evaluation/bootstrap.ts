import {
	createEvaluationDb,
	createEvaluationUnitOfWork,
	createPgCommandJournalRepository,
} from "@anxionos/evaluation";
import type { Pool } from "pg";
import { createEnvScoringPolicyQueryAdapter } from "./adapters/env-scoring-policy-query";
import { createPgCertificationSubjectQueryAdapter } from "./adapters/pg-certification-subject-query";

export interface EvaluationApiRuntime {
	unitOfWork: ReturnType<typeof createEvaluationUnitOfWork>;
	commandJournal: ReturnType<typeof createPgCommandJournalRepository>;
	certifications: ReturnType<typeof createEvaluationDb>["certifications"];
	evaluationRecords: ReturnType<typeof createEvaluationDb>["evaluationRecords"];
	evaluationScores: ReturnType<typeof createEvaluationDb>["evaluationScores"];
	subjectQuery: ReturnType<typeof createPgCertificationSubjectQueryAdapter>;
	scoringPolicyQuery: ReturnType<typeof createEnvScoringPolicyQueryAdapter>;
}

export function createEvaluationApiRuntime(pool: Pool): EvaluationApiRuntime {
	const db = createEvaluationDb(pool);
	return {
		unitOfWork: createEvaluationUnitOfWork(pool),
		commandJournal: createPgCommandJournalRepository(pool),
		certifications: db.certifications,
		evaluationRecords: db.evaluationRecords,
		evaluationScores: db.evaluationScores,
		subjectQuery: createPgCertificationSubjectQueryAdapter(pool),
		scoringPolicyQuery: createEnvScoringPolicyQueryAdapter(),
	};
}
