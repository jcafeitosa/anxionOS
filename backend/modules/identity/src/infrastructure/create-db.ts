import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import type { PrincipalRepository } from "../domain/ports/principal-repository";
import type { ServiceIdentityRepository } from "../domain/ports/service-identity-repository";
import { createIdentityUnitOfWork } from "./identity-unit-of-work";
import { createDrizzlePrincipalRepository } from "./persistence/principal-repository";
import * as schema from "./persistence/schema";
import { createDrizzleServiceIdentityRepository } from "./persistence/service-identity-repository";

export function createIdentityDb(pool: Pool): {
	db: ReturnType<typeof drizzle<typeof schema>>;
	repository: PrincipalRepository;
	serviceIdentityRepository: ServiceIdentityRepository;
	unitOfWork: ReturnType<typeof createIdentityUnitOfWork>;
} {
	const db = drizzle(pool, { schema });
	const repository = createDrizzlePrincipalRepository(db);
	const serviceIdentityRepository = createDrizzleServiceIdentityRepository(db);
	const unitOfWork = createIdentityUnitOfWork(pool);
	return { db, repository, serviceIdentityRepository, unitOfWork };
}
