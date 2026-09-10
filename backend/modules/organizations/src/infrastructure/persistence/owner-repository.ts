import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Owner } from "../../domain/entities/owner";
import type { OwnerRepository } from "../../domain/ports/owner-repository";
import { owners, type OwnerRow } from "./schema";

export function toOwner(row: OwnerRow): Owner {
	return {
		id: row.id,
		principalId: row.principalId,
		defaultOrganizationId: row.defaultOrganizationId ?? undefined,
		createdAt: row.createdAt,
	};
}

export function createDrizzleOwnerRepository(
	db: NodePgDatabase<{ owners: typeof owners }>,
): OwnerRepository {
	return {
		async save(owner: Owner) {
			const existing = await db.select().from(owners).where(eq(owners.id, owner.id)).limit(1);
			if (existing[0]) {
				const rows = await db
					.update(owners)
					.set({
						principalId: owner.principalId,
						defaultOrganizationId: owner.defaultOrganizationId ?? null,
					})
					.where(eq(owners.id, owner.id))
					.returning();
				const row = rows[0];
				if (!row) throw new Error("Failed to update owner");
				return toOwner(row);
			}
			const scopeAgencyId = owner.defaultOrganizationId;
			if (!scopeAgencyId) {
				throw new Error("Owner insert requires defaultOrganizationId for tenant scope");
			}
			const rows = await db
				.insert(owners)
				.values({
					id: owner.id,
					tenantId: scopeAgencyId,
					agencyId: scopeAgencyId,
					principalId: owner.principalId,
					defaultOrganizationId: owner.defaultOrganizationId ?? null,
					createdAt: owner.createdAt,
				})
				.returning();
			const row = rows[0];
			if (!row) throw new Error("Failed to create owner");
			return toOwner(row);
		},
		async findByPrincipalId(principalId: string) {
			const rows = await db
				.select()
				.from(owners)
				.where(eq(owners.principalId, principalId))
				.limit(1);
			return rows[0] ? toOwner(rows[0]) : null;
		},
	};
}
