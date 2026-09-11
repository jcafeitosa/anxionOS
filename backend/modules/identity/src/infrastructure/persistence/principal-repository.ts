import { and, eq, isNull, ne, or, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { NewPrincipal, Principal } from "../../domain/entities/principal";
import type { PrincipalRepository } from "../../domain/ports/principal-repository";
import type * as schema from "./schema";
import { type PrincipalRow, principals } from "./schema";

type IdentityDb = NodePgDatabase<typeof schema>;

export function toPrincipal(row: PrincipalRow): Principal {
	return {
		id: row.id,
		authUserId: row.authUserId ?? null,
		email: row.email,
		kind: row.kind,
		status: row.status,
		revision: row.revision,
		createdAt: row.createdAt,
		suspendedAt: row.suspendedAt ?? null,
		suspensionReason: row.suspensionReason ?? null,
		revokedAt: row.revokedAt ?? null,
		revocationReason: row.revocationReason ?? null,
	};
}

/** Every mutation bumps `revision` so callers can retry with a fresh token. */
const nextRevision = sql`${principals.revision} + 1`;

export function createDrizzlePrincipalRepository(
	db: IdentityDb,
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
		async listSuspended(): Promise<Principal[]> {
			const rows = await db
				.select()
				.from(principals)
				.where(eq(principals.status, "suspended"))
				.orderBy(principals.createdAt);
			return rows.map(toPrincipal);
		},
		async listAll(): Promise<Principal[]> {
			const rows = await db
				.select()
				.from(principals)
				.orderBy(principals.createdAt);
			return rows.map(toPrincipal);
		},
		async createIfAbsent(input: NewPrincipal): Promise<Principal | null> {
			// Sem alvo: qualquer indice unico em conflito (auth_user_id ou email)
			// resolve como "nenhuma linha" em vez de 23505, preservando a transacao.
			const rows = await db
				.insert(principals)
				.values({
					authUserId: input.authUserId ?? null,
					email: input.email,
					kind: input.kind ?? "human",
				})
				.onConflictDoNothing()
				.returning();
			return rows[0] ? toPrincipal(rows[0]) : null;
		},
		async markSuspended(
			id: string,
			reasonCode: string,
			suspendedAt: Date,
			expectedRevision?: number,
		): Promise<Principal | null> {
			const conditions = [
				eq(principals.id, id),
				eq(principals.status, "active"),
			];
			if (expectedRevision !== undefined) {
				conditions.push(eq(principals.revision, expectedRevision));
			}
			const rows = await db
				.update(principals)
				.set({
					status: "suspended",
					suspendedAt,
					suspensionReason: reasonCode,
					revision: nextRevision,
				})
				.where(and(...conditions))
				.returning();
			return rows[0] ? toPrincipal(rows[0]) : null;
		},
		async reactivate(
			id: string,
			expectedRevision?: number,
		): Promise<Principal | null> {
			const conditions = [
				eq(principals.id, id),
				eq(principals.status, "suspended"),
			];
			if (expectedRevision !== undefined) {
				conditions.push(eq(principals.revision, expectedRevision));
			}
			const rows = await db
				.update(principals)
				.set({
					status: "active",
					suspendedAt: null,
					suspensionReason: null,
					revision: nextRevision,
				})
				.where(and(...conditions))
				.returning();
			return rows[0] ? toPrincipal(rows[0]) : null;
		},
		async revoke(
			id: string,
			reasonCode: string,
			revokedAt: Date,
			expectedRevision?: number,
		): Promise<Principal | null> {
			// REVOKED is terminal: only active/suspended rows can transition.
			const conditions = [
				eq(principals.id, id),
				ne(principals.status, "revoked"),
			];
			if (expectedRevision !== undefined) {
				conditions.push(eq(principals.revision, expectedRevision));
			}
			const rows = await db
				.update(principals)
				.set({
					status: "revoked",
					revokedAt,
					revocationReason: reasonCode,
					revision: nextRevision,
				})
				.where(and(...conditions))
				.returning();
			return rows[0] ? toPrincipal(rows[0]) : null;
		},
		async linkAuthUserId(
			id: string,
			authUserId: string,
		): Promise<Principal | null> {
			// Relinking the same auth user is a no-op and must not bump revision
			// (mirrors updateEmail). A NULL auth_user_id means "not linked yet".
			const rows = await db
				.update(principals)
				.set({ authUserId, revision: nextRevision })
				.where(
					and(
						eq(principals.id, id),
						or(
							isNull(principals.authUserId),
							ne(principals.authUserId, authUserId),
						),
					),
				)
				.returning();
			if (rows[0]) {
				return toPrincipal(rows[0]);
			}
			const existing = await db
				.select()
				.from(principals)
				.where(eq(principals.id, id))
				.limit(1);
			return existing[0] ? toPrincipal(existing[0]) : null;
		},
		async updateEmail(id: string, email: string): Promise<Principal | null> {
			const rows = await db
				.update(principals)
				.set({ email, revision: nextRevision })
				.where(and(eq(principals.id, id), ne(principals.email, email)))
				.returning();
			if (rows[0]) {
				return toPrincipal(rows[0]);
			}
			// No-op when the email is already the stored value: return the row
			// instead of reporting a spurious not-found.
			const existing = await db
				.select()
				.from(principals)
				.where(eq(principals.id, id))
				.limit(1);
			return existing[0] ? toPrincipal(existing[0]) : null;
		},
	};
}
