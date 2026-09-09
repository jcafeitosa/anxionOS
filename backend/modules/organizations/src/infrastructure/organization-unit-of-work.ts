import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool, PoolClient } from "pg";
import type {
	OrganizationTransactionContext,
	OrganizationUnitOfWork,
} from "../domain/ports/organization-unit-of-work";
import { createDrizzleAgencyRepository } from "./persistence/agency-repository";
import { createDrizzleCommandJournalRepository } from "./persistence/command-journal-repository";
import { createDrizzleMembershipRepository } from "./persistence/membership-repository";
import { createDrizzleOwnerRepository } from "./persistence/owner-repository";
import * as schema from "./persistence/schema";

function createTransactionContext(client: PoolClient): OrganizationTransactionContext {
	const db = drizzle(client, { schema });
	return {
		client,
		agencyRepository: createDrizzleAgencyRepository(db),
		ownerRepository: createDrizzleOwnerRepository(db),
		membershipRepository: createDrizzleMembershipRepository(db),
		commandJournal: createDrizzleCommandJournalRepository(db),
		async publishEvents(envelopes: DomainEventEnvelope[]) {
			for (const envelope of envelopes) {
				await appendJournal(client, envelope);
				await enqueueOutbox(client, envelope);
			}
		},
	};
}

export function createOrganizationUnitOfWork(pool: Pool): OrganizationUnitOfWork {
	return {
		async runInTransaction<T>(
			work: (context: OrganizationTransactionContext) => Promise<T>,
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
