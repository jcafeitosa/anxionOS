import { and, desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
	NewServiceCredential,
	ServiceCredential,
} from "../../domain/entities/service-credential";
import type { ServiceCredentialRepository } from "../../domain/ports/service-credential-repository";
import type * as schema from "./schema";
import { type ServiceCredentialRow, serviceCredentials } from "./schema";

type IdentityDb = NodePgDatabase<typeof schema>;

function toServiceCredential(row: ServiceCredentialRow): ServiceCredential {
	return {
		id: row.id,
		serviceIdentityId: row.serviceIdentityId,
		prefix: row.prefix,
		secretHash: row.secretHash,
		status: row.status,
		issuedAt: row.issuedAt,
		expiresAt: row.expiresAt ?? null,
		rotatedAt: row.rotatedAt ?? null,
		rotatedToId: row.rotatedToId ?? null,
		revokedAt: row.revokedAt ?? null,
	};
}

export function createDrizzleServiceCredentialRepository(
	db: IdentityDb,
): ServiceCredentialRepository {
	return {
		async findById(id: string): Promise<ServiceCredential | null> {
			const rows = await db
				.select()
				.from(serviceCredentials)
				.where(eq(serviceCredentials.id, id))
				.limit(1);
			return rows[0] ? toServiceCredential(rows[0]) : null;
		},
		async findByPrefix(prefix: string): Promise<ServiceCredential | null> {
			const rows = await db
				.select()
				.from(serviceCredentials)
				.where(eq(serviceCredentials.prefix, prefix))
				.limit(1);
			return rows[0] ? toServiceCredential(rows[0]) : null;
		},
		async listByServiceIdentityId(
			serviceIdentityId: string,
		): Promise<ServiceCredential[]> {
			const rows = await db
				.select()
				.from(serviceCredentials)
				.where(eq(serviceCredentials.serviceIdentityId, serviceIdentityId))
				.orderBy(desc(serviceCredentials.issuedAt));
			return rows.map(toServiceCredential);
		},
		async create(input: NewServiceCredential): Promise<ServiceCredential> {
			const rows = await db
				.insert(serviceCredentials)
				.values({
					serviceIdentityId: input.serviceIdentityId,
					prefix: input.prefix,
					secretHash: input.secretHash,
					expiresAt: input.expiresAt ?? null,
				})
				.returning();
			const row = rows[0];
			if (!row) {
				throw new Error("Failed to create service credential");
			}
			return toServiceCredential(row);
		},
		async markRotated(
			id: string,
			rotatedToId: string,
			rotatedAt: Date,
		): Promise<ServiceCredential | null> {
			const rows = await db
				.update(serviceCredentials)
				.set({ status: "rotated", rotatedAt, rotatedToId })
				.where(
					and(
						eq(serviceCredentials.id, id),
						eq(serviceCredentials.status, "active"),
					),
				)
				.returning();
			return rows[0] ? toServiceCredential(rows[0]) : null;
		},
		async revoke(
			id: string,
			revokedAt: Date,
		): Promise<ServiceCredential | null> {
			const rows = await db
				.update(serviceCredentials)
				.set({ status: "revoked", revokedAt })
				.where(
					and(
						eq(serviceCredentials.id, id),
						eq(serviceCredentials.status, "active"),
					),
				)
				.returning();
			return rows[0] ? toServiceCredential(rows[0]) : null;
		},
		async revokeActiveByServiceIdentityId(
			serviceIdentityId: string,
			revokedAt: Date,
		): Promise<ServiceCredential[]> {
			const rows = await db
				.update(serviceCredentials)
				.set({ status: "revoked", revokedAt })
				.where(
					and(
						eq(serviceCredentials.serviceIdentityId, serviceIdentityId),
						eq(serviceCredentials.status, "active"),
					),
				)
				.returning();
			return rows.map(toServiceCredential);
		},
	};
}
