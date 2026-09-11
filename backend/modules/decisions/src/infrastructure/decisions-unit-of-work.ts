import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import type { Pool, PoolClient } from "pg";
import type {
	DecisionsTransactionContext,
	DecisionsUnitOfWork,
} from "../domain/ports/decisions-unit-of-work";
import { createPgCommandJournalRepository } from "./persistence/command-journal-repository";
import {
	createPgApprovalRepository,
	createPgDecisionRepository,
	createPgDispositionRepository,
	createPgProposalRepository,
	createPgTradeIntentRepository,
} from "./persistence/repositories";
import { createPgEvidenceManifestRepository } from "./persistence/evidence-manifest-repository";
import { createPgSubmitPreconditionsRepository } from "./persistence/submit-preconditions-repository";

function createTransactionContext(
	client: PoolClient,
): DecisionsTransactionContext {
	return {
		commandJournal: createPgCommandJournalRepository(client),
		decisions: createPgDecisionRepository(client),
		proposals: createPgProposalRepository(client),
		tradeIntents: createPgTradeIntentRepository(client),
		approvals: createPgApprovalRepository(client),
		dispositions: createPgDispositionRepository(client),
		submitPreconditions: createPgSubmitPreconditionsRepository(client),
		evidenceManifests: createPgEvidenceManifestRepository(client),
		async publishEvents(envelopes: DomainEventEnvelope[]) {
			for (const envelope of envelopes) {
				await appendJournal(client, envelope);
				await enqueueOutbox(client, envelope);
			}
		},
	};
}

export function createDecisionsUnitOfWork(pool: Pool): DecisionsUnitOfWork {
	return {
		async runInTransaction<T>(
			work: (ctx: DecisionsTransactionContext) => Promise<T>,
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
