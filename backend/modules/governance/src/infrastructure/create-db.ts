import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { createDrizzleApprovalRepository } from "./persistence/approval-repository";
import { createDrizzleAuthorityEpochStore } from "./persistence/authority-epoch-store";
import { createDrizzleAutonomyAssignmentRepository } from "./persistence/autonomy-assignment-repository";
import { createDrizzleChangeProposalRepository } from "./persistence/change-proposal-repository";
import { createDrizzleCommandJournalRepository } from "./persistence/command-journal-repository";
import { createDrizzleGrantRepository } from "./persistence/grant-repository";
import * as schema from "./persistence/schema";

export function createGovernanceDb(pool: Pool) {
	const db = drizzle(pool, { schema });
	return {
		db,
		schema,
		authorityEpochStore: createDrizzleAuthorityEpochStore(db),
		commandJournal: createDrizzleCommandJournalRepository(db),
		grantRepository: createDrizzleGrantRepository(db),
		changeProposalRepository: createDrizzleChangeProposalRepository(db),
		approvalRepository: createDrizzleApprovalRepository(db),
		autonomyAssignmentRepository: createDrizzleAutonomyAssignmentRepository(db),
	};
}
