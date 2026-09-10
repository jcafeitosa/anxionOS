import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool, PoolClient } from "pg";
import { createDrizzleAgencyRepository } from "./persistence/agency-repository";
import { createDrizzleCommandJournalRepository } from "./persistence/command-journal-repository";
import { createDrizzleMembershipRepository } from "./persistence/membership-repository";
import { createDrizzleOwnerRepository } from "./persistence/owner-repository";
import * as schema from "./persistence/schema";

export function createOrganizationsDb(pool: Pool | PoolClient) {
	const db = drizzle(pool, { schema });
	return {
		db,
		schema,
		agencyRepository: createDrizzleAgencyRepository(db),
		ownerRepository: createDrizzleOwnerRepository(db),
		membershipRepository: createDrizzleMembershipRepository(db),
		commandJournal: createDrizzleCommandJournalRepository(db),
	};
}
