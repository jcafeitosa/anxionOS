import { and, desc, eq, gte } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
	NewSessionRef,
	SessionRef,
} from "../../domain/entities/session-ref";
import type { SessionRefRepository } from "../../domain/ports/session-ref-repository";
import type * as schema from "./schema";
import { type SessionRefRow, sessionRefs } from "./schema";

type IdentityDb = NodePgDatabase<typeof schema>;

function toSessionRef(row: SessionRefRow): SessionRef {
	return {
		id: row.id,
		principalId: row.principalId,
		status: row.status,
		externalRefHash: row.externalRefHash,
		createdAt: row.createdAt,
		revokedAt: row.revokedAt ?? null,
		revocationReason: row.revocationReason ?? null,
	};
}

export function createDrizzleSessionRefRepository(
	db: IdentityDb,
): SessionRefRepository {
	async function findById(id: string): Promise<SessionRef | null> {
		const rows = await db
			.select()
			.from(sessionRefs)
			.where(eq(sessionRefs.id, id))
			.limit(1);
		return rows[0] ? toSessionRef(rows[0]) : null;
	}

	async function findByExternalRefHash(
		externalRefHash: string,
	): Promise<SessionRef | null> {
		const rows = await db
			.select()
			.from(sessionRefs)
			.where(eq(sessionRefs.externalRefHash, externalRefHash))
			.limit(1);
		return rows[0] ? toSessionRef(rows[0]) : null;
	}

	async function revoke(
		id: string,
		revokedAt: Date,
		reasonCode?: string | null,
	): Promise<SessionRef | null> {
		const rows = await db
			.update(sessionRefs)
			.set({
				status: "revoked",
				revokedAt,
				revocationReason: reasonCode ?? null,
			})
			.where(and(eq(sessionRefs.id, id), eq(sessionRefs.status, "active")))
			.returning();
		return rows[0] ? toSessionRef(rows[0]) : null;
	}

	return {
		findById,
		findByExternalRefHash,
		async listByPrincipalId(principalId: string): Promise<SessionRef[]> {
			const rows = await db
				.select()
				.from(sessionRefs)
				.where(eq(sessionRefs.principalId, principalId))
				.orderBy(desc(sessionRefs.createdAt));
			return rows.map(toSessionRef);
		},
		async listRevoked(since?: Date): Promise<SessionRef[]> {
			const where =
				since === undefined
					? eq(sessionRefs.status, "revoked")
					: and(
							eq(sessionRefs.status, "revoked"),
							gte(sessionRefs.revokedAt, since),
						);
			const rows = await db
				.select()
				.from(sessionRefs)
				.where(where)
				.orderBy(desc(sessionRefs.revokedAt));
			return rows.map(toSessionRef);
		},
		async create(input: NewSessionRef): Promise<SessionRef> {
			const rows = await db
				.insert(sessionRefs)
				.values({
					...(input.id ? { id: input.id } : {}),
					principalId: input.principalId,
					externalRefHash: input.externalRefHash,
				})
				.returning();
			const row = rows[0];
			if (!row) {
				throw new Error("Failed to create session reference");
			}
			return toSessionRef(row);
		},
		async recordRevoked(input: {
			id?: string;
			principalId: string;
			externalRefHash: string;
			revokedAt: Date;
			reasonCode?: string | null;
		}): Promise<SessionRef> {
			const existing = await findByExternalRefHash(input.externalRefHash);
			if (existing) {
				if (existing.status === "revoked") {
					return existing;
				}
				return (
					(await revoke(existing.id, input.revokedAt, input.reasonCode)) ??
					existing
				);
			}
			const rows = await db
				.insert(sessionRefs)
				.values({
					...(input.id ? { id: input.id } : {}),
					principalId: input.principalId,
					externalRefHash: input.externalRefHash,
					status: "revoked",
					revokedAt: input.revokedAt,
					revocationReason: input.reasonCode ?? null,
				})
				.returning();
			const row = rows[0];
			if (!row) {
				throw new Error("Failed to record revoked session reference");
			}
			return toSessionRef(row);
		},
		revoke,
		async revokeActiveByPrincipalId(
			principalId: string,
			revokedAt: Date,
			reasonCode?: string | null,
		): Promise<SessionRef[]> {
			const rows = await db
				.update(sessionRefs)
				.set({
					status: "revoked",
					revokedAt,
					revocationReason: reasonCode ?? null,
				})
				.where(
					and(
						eq(sessionRefs.principalId, principalId),
						eq(sessionRefs.status, "active"),
					),
				)
				.returning();
			return rows.map(toSessionRef);
		},
	};
}
