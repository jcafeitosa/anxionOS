import { and, desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
	NewServiceIdentity,
	ServiceIdentity,
} from "../../domain/entities/service-identity";
import type { ServiceIdentityRepository } from "../../domain/ports/service-identity-repository";
import type * as schema from "./schema";
import { type ServiceIdentityRow, serviceIdentities } from "./schema";

type IdentityDb = NodePgDatabase<typeof schema>;

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
	db: IdentityDb,
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
		async findActiveByPrincipalId(
			principalId: string,
		): Promise<ServiceIdentity[]> {
			const rows = await db
				.select()
				.from(serviceIdentities)
				.where(
					and(
						eq(serviceIdentities.principalId, principalId),
						eq(serviceIdentities.status, "active"),
					),
				)
				.orderBy(desc(serviceIdentities.createdAt));
			return rows.map(toServiceIdentity);
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
				.where(
					and(
						eq(serviceIdentities.id, id),
						eq(serviceIdentities.status, "active"),
					),
				)
				.returning();
			return rows[0] ? toServiceIdentity(rows[0]) : null;
		},
	};
}
