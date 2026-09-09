import type { Pool } from "pg";

/** PostgreSQL pool used by graph persistence and projection inbox (composition root injects `pg` Pool). */
export type GraphDatabasePool = Pool;
