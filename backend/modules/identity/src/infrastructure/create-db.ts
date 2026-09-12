import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool, PoolClient } from "pg";
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

/**
 * ANX-477 — leitura de identidade na conexao de OUTRO dono (transacao do
 * chamador), sem pedir uma segunda conexao ao pool.
 *
 * Existe porque `createIdentityDb` exige um `Pool` (ele tambem monta o
 * `unitOfWork`, que faz `pool.connect()`), mas quem le identidade dentro de uma
 * transacao alheia ja' tem um `PoolClient`. Sem esta fabrica, o consumidor
 * precisaria de um cast (`client as unknown as Pool`), que apagaria justamente a
 * distincao entre "conexao dedicada" e "conexao emprestada" — e um cast assim
 * sobreviveria a uma mudanca que passasse a chamar `unitOfWork`.
 *
 * O driver aceita `Pool | PoolClient`; so' o `unitaOfWork` (nao exposto aqui) e'
 * especifico de `Pool`.
 */
export function createIdentityRepositoryOn(
	client: Pool | PoolClient,
): PrincipalRepository {
	return createDrizzlePrincipalRepository(drizzle(client, { schema }));
}
