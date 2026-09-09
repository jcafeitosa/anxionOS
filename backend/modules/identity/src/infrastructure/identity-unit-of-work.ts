import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool, PoolClient } from "pg";
import type {
	IdentityTransactionContext,
	IdentityUnitOfWork,
} from "../domain/ports/identity-unit-of-work";
import { createDrizzlePrincipalRepository } from "./persistence/principal-repository";
import { createDrizzleServiceIdentityRepository } from "./persistence/service-identity-repository";
import * as schema from "./persistence/schema";

function createTransactionContext(client: PoolClient): IdentityTransactionContext {
	const db = drizzle(client, { schema });
	return {
		principalRepository: createDrizzlePrincipalRepository(db),
		serviceIdentityRepository: createDrizzleServiceIdentityRepository(db),
		async publishEvents(envelopes: DomainEventEnvelope[]) {
			for (const envelope of envelopes) {
				await appendJournal(client, envelope);
				await enqueueOutbox(client, envelope);
			}
		},
	};
}

export function createIdentityUnitOfWork(pool: Pool): IdentityUnitOfWork {
	return {
		async runInTransaction<T>(
			work: (context: IdentityTransactionContext) => Promise<T>,
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
