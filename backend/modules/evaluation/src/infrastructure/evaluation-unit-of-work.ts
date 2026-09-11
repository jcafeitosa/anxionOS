import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import type { Pool, PoolClient } from "pg";
import type {
	EvaluationTransactionContext,
	EvaluationUnitOfWork,
} from "../domain/ports/evaluation-unit-of-work";
import { createPgCertificationRepository } from "./persistence/certification-repository";
import { createPgCommandJournalRepository } from "./persistence/command-journal-repository";
import {
	createPgEvaluationRecordRepository,
	createPgEvaluationScoreRepository,
} from "./persistence/repositories";

function createTransactionContext(
	client: PoolClient,
): EvaluationTransactionContext {
	return {
		commandJournal: createPgCommandJournalRepository(client),
		evaluationRecords: createPgEvaluationRecordRepository(client),
		evaluationScores: createPgEvaluationScoreRepository(client),
		certifications: createPgCertificationRepository(client),
		async publishEvents(envelopes: DomainEventEnvelope[]) {
			for (const envelope of envelopes) {
				await appendJournal(client, envelope);
				await enqueueOutbox(client, envelope);
			}
		},
	};
}

export function createEvaluationUnitOfWork(pool: Pool): EvaluationUnitOfWork {
	return {
		async runInTransaction<T>(
			work: (ctx: EvaluationTransactionContext) => Promise<T>,
		) {
			const client = await pool.connect();
			try {
				await client.query("BEGIN");
				const ctx = createTransactionContext(client);
				const result = await work(ctx);
				await client.query("COMMIT");
				return result;
			} catch (error) {
				await client.query("ROLLBACK");
				throw error;
			} finally {
				client.release();
			}
		},
	};
}
