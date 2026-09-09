import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import type { PrincipalRepository } from "../domain/ports/principal-repository";
import { createDrizzlePrincipalRepository } from "./persistence/principal-repository";
import * as schema from "./persistence/schema";

export function createIdentityDb(pool: Pool): {
	db: ReturnType<typeof drizzle<typeof schema>>;
	repository: PrincipalRepository;
} {
	const db = drizzle(pool, { schema });
	const repository = createDrizzlePrincipalRepository(db);
	return { db, repository };
}
