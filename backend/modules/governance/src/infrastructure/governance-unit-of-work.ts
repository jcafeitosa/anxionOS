import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool, PoolClient } from "pg";
import type {
	GovernanceTransactionContext,
	GovernanceUnitOfWork,
} from "../domain/ports/governance-unit-of-work";
import { createDrizzleApprovalRepository } from "./persistence/approval-repository";
import { createDrizzleAuthorityEpochStore } from "./persistence/authority-epoch-store";
import { createDrizzleChangeProposalRepository } from "./persistence/change-proposal-repository";
import { createDrizzleCommandJournalRepository } from "./persistence/command-journal-repository";
import { createDrizzleGrantRepository } from "./persistence/grant-repository";
import * as schema from "./persistence/schema";

function createTransactionContext(client: PoolClient): GovernanceTransactionContext {
	const db = drizzle(client, { schema });
	return {
		client,
		grantRepository: createDrizzleGrantRepository(db),
		changeProposalRepository: createDrizzleChangeProposalRepository(db),
		approvalRepository: createDrizzleApprovalRepository(db),
		authorityEpochStore: createDrizzleAuthorityEpochStore(db),
		commandJournal: createDrizzleCommandJournalRepository(db),
		async publishEvents(envelopes: DomainEventEnvelope[]) {
			for (const envelope of envelopes) {
				await appendJournal(client, envelope);
				await enqueueOutbox(client, envelope);
			}
		},
	};
}

export function createGovernanceUnitOfWork(pool: Pool): GovernanceUnitOfWork {
	return {
		async runInTransaction<T>(
			work: (context: GovernanceTransactionContext) => Promise<T>,
		): Promise<T> {
			const client = await pool.connect();
			try {
				await client.query("BEGIN");
				const context = createTransactionContext(client);
				const result = await work(context);
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
