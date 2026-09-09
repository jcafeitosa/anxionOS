import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { NewPrincipal, Principal } from "../../domain/entities/principal";
import type { PrincipalRepository } from "../../domain/ports/principal-repository";
import { principals, type PrincipalRow } from "./schema";

export function toPrincipal(row: PrincipalRow): Principal {
	return {
		id: row.id,
		authUserId: row.authUserId,
		email: row.email,
		status: row.status,
		createdAt: row.createdAt,
		suspendedAt: row.suspendedAt ?? null,
		suspensionReason: row.suspensionReason ?? null,
	};
}

export function createDrizzlePrincipalRepository(
	db: NodePgDatabase<{ principals: typeof principals }>,
): PrincipalRepository {
	return {
		async findById(id: string): Promise<Principal | null> {
			const rows = await db
				.select()
				.from(principals)
				.where(eq(principals.id, id))
				.limit(1);
			return rows[0] ? toPrincipal(rows[0]) : null;
		},
		async findByAuthUserId(authUserId: string): Promise<Principal | null> {
			const rows = await db
				.select()
				.from(principals)
				.where(eq(principals.authUserId, authUserId))
				.limit(1);
			return rows[0] ? toPrincipal(rows[0]) : null;
		},
		async findByEmail(email: string): Promise<Principal | null> {
			const rows = await db
				.select()
				.from(principals)
				.where(eq(principals.email, email))
				.limit(1);
			return rows[0] ? toPrincipal(rows[0]) : null;
		},
		async create(input: NewPrincipal): Promise<Principal> {
			const rows = await db
				.insert(principals)
				.values({
					authUserId: input.authUserId,
					email: input.email,
				})
				.returning();
			const row = rows[0];
			if (!row) {
				throw new Error("Failed to create principal");
			}
			return toPrincipal(row);
		},
	};
}
