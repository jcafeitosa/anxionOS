import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
	AuthorityEpochRecord,
	AuthorityEpochStore,
} from "../../domain/ports/authority-epoch-store";
import { type AuthorityEpochRow, authorityEpochs } from "./schema";

function toAuthorityEpochRecord(row: AuthorityEpochRow): AuthorityEpochRecord {
	return {
		tenantId: row.tenantId,
		agencyId: row.agencyId,
		scopeId: row.scopeId,
		epoch: row.epoch,
		updatedAt: row.updatedAt,
	};
}

export function createDrizzleAuthorityEpochStore(
	db: NodePgDatabase<{ authorityEpochs: typeof authorityEpochs }>,
): AuthorityEpochStore {
	return {
		async get(scopeId: string) {
			const rows = await db
				.select()
				.from(authorityEpochs)
				.where(eq(authorityEpochs.scopeId, scopeId))
				.limit(1);
			const row = rows[0];
			if (row) {
				return toAuthorityEpochRecord(row);
			}
			return {
				tenantId: "",
				agencyId: "",
				scopeId,
				epoch: 0,
				updatedAt: new Date(0),
			};
		},
		async increment(scopeId: string, tenantId: string, agencyId: string) {
			const rows = await db
				.insert(authorityEpochs)
				.values({ scopeId, epoch: 1, tenantId, agencyId })
				.onConflictDoUpdate({
					target: authorityEpochs.scopeId,
					set: {
						epoch: sql`${authorityEpochs.epoch} + 1`,
						updatedAt: sql`now()`,
					},
				})
				.returning();
			const row = rows[0];
			if (!row) {
				throw new Error("Failed to increment authority epoch");
			}
			return toAuthorityEpochRecord(row);
		},
	};
}
