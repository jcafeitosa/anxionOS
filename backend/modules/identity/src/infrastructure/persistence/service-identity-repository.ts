import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
	NewServiceIdentity,
	ServiceIdentity,
} from "../../domain/entities/service-identity";
import type { ServiceIdentityRepository } from "../../domain/ports/service-identity-repository";
import { serviceIdentities, type ServiceIdentityRow } from "./schema";

function toServiceIdentity(row: ServiceIdentityRow): ServiceIdentity {
	return {
		id: row.id,
		principalId: row.principalId,
		label: row.label,
		status: row.status,
		createdAt: row.createdAt,
		revokedAt: row.revokedAt ?? null,
	};
}

export function createDrizzleServiceIdentityRepository(
	db: NodePgDatabase<{ serviceIdentities: typeof serviceIdentities; principals: typeof import("./schema").principals }>,
): ServiceIdentityRepository {
	return {
		async findById(id: string): Promise<ServiceIdentity | null> {
			const rows = await db
				.select()
				.from(serviceIdentities)
				.where(eq(serviceIdentities.id, id))
				.limit(1);
			return rows[0] ? toServiceIdentity(rows[0]) : null;
		},
		async findActiveByPrincipalId(principalId: string): Promise<ServiceIdentity[]> {
			const rows = await db
				.select()
				.from(serviceIdentities)
				.where(
					eq(serviceIdentities.principalId, principalId),
				);
			return rows
				.filter((row) => row.status === "active")
				.map(toServiceIdentity);
		},
		async create(input: NewServiceIdentity): Promise<ServiceIdentity> {
			const rows = await db
				.insert(serviceIdentities)
				.values({
					principalId: input.principalId,
					label: input.label,
				})
				.returning();
			const row = rows[0];
			if (!row) {
				throw new Error("Failed to create service identity");
			}
			return toServiceIdentity(row);
		},
		async revoke(id: string, revokedAt: Date): Promise<ServiceIdentity | null> {
			const rows = await db
				.update(serviceIdentities)
				.set({ status: "revoked", revokedAt })
				.where(eq(serviceIdentities.id, id))
				.returning();
			return rows[0] ? toServiceIdentity(rows[0]) : null;
		},
	};
}
