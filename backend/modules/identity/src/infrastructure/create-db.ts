import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import type { PrincipalRepository } from "../domain/ports/principal-repository";
import type { ServiceCredentialRepository } from "../domain/ports/service-credential-repository";
import type { ServiceIdentityRepository } from "../domain/ports/service-identity-repository";
import type { SessionRefRepository } from "../domain/ports/session-ref-repository";
import { createIdentityUnitOfWork } from "./identity-unit-of-work";
import { createDrizzleCommandJournalRepository } from "./persistence/command-journal-repository";
import { createDrizzlePrincipalRepository } from "./persistence/principal-repository";
import * as schema from "./persistence/schema";
import { createDrizzleServiceCredentialRepository } from "./persistence/service-credential-repository";
import { createDrizzleServiceIdentityRepository } from "./persistence/service-identity-repository";
import { createDrizzleSessionRefRepository } from "./persistence/session-ref-repository";

export function createIdentityDb(pool: Pool): {
	db: ReturnType<typeof drizzle<typeof schema>>;
	repository: PrincipalRepository;
	serviceIdentityRepository: ServiceIdentityRepository;
	serviceCredentialRepository: ServiceCredentialRepository;
	sessionRefRepository: SessionRefRepository;
	commandJournal: CommandJournalRepository;
	unitOfWork: ReturnType<typeof createIdentityUnitOfWork>;
} {
	const db = drizzle(pool, { schema });
	return {
		db,
		repository: createDrizzlePrincipalRepository(db),
		serviceIdentityRepository: createDrizzleServiceIdentityRepository(db),
		serviceCredentialRepository: createDrizzleServiceCredentialRepository(db),
		sessionRefRepository: createDrizzleSessionRefRepository(db),
		commandJournal: createDrizzleCommandJournalRepository(db),
		unitOfWork: createIdentityUnitOfWork(pool),
	};
}
