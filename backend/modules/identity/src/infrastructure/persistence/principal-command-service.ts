import { randomUUID } from "node:crypto";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import {
	IDENTITY_EVENT_TYPES,
	IDENTITY_OWNER_DOMAIN,
	identityPrincipalEmailUpdatedV1PayloadSchema,
	identityPrincipalRegisteredV1PayloadSchema,
	identityPrincipalSuspendedV1PayloadSchema,
} from "@anxionos/contracts/identity";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import { and, eq, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import type { PrincipalCommandsPort } from "../../domain/ports/principal-commands";
import { toPrincipal } from "./principal-repository";
import { principals } from "./schema";

export function createPrincipalCommandsService(
	pool: Pool,
): PrincipalCommandsPort {
	return {
		async register(input) {
			const client = await pool.connect();
			try {
				await client.query("BEGIN");
				const db = drizzle(client, { schema: { principals } });
				const emailRows = await db
					.select()
					.from(principals)
					.where(eq(principals.email, input.email))
					.limit(1);
				if (emailRows[0]) {
					throw new Error("PRINCIPAL_EMAIL_TAKEN");
				}
				const inserted = await db
					.insert(principals)
					.values({
						authUserId: input.authUserId,
						email: input.email,
					})
					.returning();
				const row = inserted[0];
				if (!row) {
					throw new Error("Failed to create principal");
				}
				const principal = toPrincipal(row);
				const payload = identityPrincipalRegisteredV1PayloadSchema.parse({
					principalId: principal.id,
					email: principal.email,
				});
				const envelope = domainEventEnvelopeSchema.parse({
					eventId: randomUUID(),
					schemaVersion: "0.1.0",
					ownerDomain: IDENTITY_OWNER_DOMAIN,
					eventType: IDENTITY_EVENT_TYPES.PRINCIPAL_REGISTERED,
					occurredAt: new Date().toISOString(),
					payload,
				});
				await appendJournal(client, envelope);
				await enqueueOutbox(client, envelope);
				await client.query("COMMIT");
				return principal;
			} catch (error) {
				await client.query("ROLLBACK");
				throw error;
			} finally {
				client.release();
			}
		},
		async suspend(principalId, reasonCode) {
			const suspendedAt = new Date();
			const client = await pool.connect();
			try {
				await client.query("BEGIN");
				const db = drizzle(client, { schema: { principals } });
				const updated = await db
					.update(principals)
					.set({
						status: "suspended",
						suspendedAt,
						suspensionReason: reasonCode,
					})
					.where(eq(principals.id, principalId))
					.returning();
				const row = updated[0];
				if (!row) {
					throw new Error("PRINCIPAL_NOT_FOUND");
				}
				const principal = toPrincipal(row);
				const payload = identityPrincipalSuspendedV1PayloadSchema.parse({
					principalId: principal.id,
					reasonCode,
					suspendedAt: suspendedAt.toISOString(),
				});
				const envelope = domainEventEnvelopeSchema.parse({
					eventId: randomUUID(),
					schemaVersion: "0.1.0",
					ownerDomain: IDENTITY_OWNER_DOMAIN,
					eventType: IDENTITY_EVENT_TYPES.PRINCIPAL_SUSPENDED,
					occurredAt: suspendedAt.toISOString(),
					payload,
				});
				await appendJournal(client, envelope);
				await enqueueOutbox(client, envelope);
				await client.query("COMMIT");
				return principal;
			} catch (error) {
				await client.query("ROLLBACK");
				throw error;
			} finally {
				client.release();
			}
		},
		async syncEmail(principalId, email) {
			const client = await pool.connect();
			try {
				await client.query("BEGIN");
				const db = drizzle(client, { schema: { principals } });
				const emailTaken = await db
					.select()
					.from(principals)
					.where(
						and(eq(principals.email, email), ne(principals.id, principalId)),
					)
					.limit(1);
				if (emailTaken[0]) {
					throw new Error("PRINCIPAL_EMAIL_TAKEN");
				}
				const updated = await db
					.update(principals)
					.set({ email })
					.where(eq(principals.id, principalId))
					.returning();
				const row = updated[0];
				if (!row) {
					throw new Error("PRINCIPAL_NOT_FOUND");
				}
				const principal = toPrincipal(row);
				const payload = identityPrincipalEmailUpdatedV1PayloadSchema.parse({
					principalId: principal.id,
					email: principal.email,
				});
				const envelope = domainEventEnvelopeSchema.parse({
					eventId: randomUUID(),
					schemaVersion: "0.1.0",
					ownerDomain: IDENTITY_OWNER_DOMAIN,
					eventType: IDENTITY_EVENT_TYPES.PRINCIPAL_EMAIL_UPDATED,
					occurredAt: new Date().toISOString(),
					payload,
				});
				await appendJournal(client, envelope);
				await enqueueOutbox(client, envelope);
				await client.query("COMMIT");
				return principal;
			} catch (error) {
				await client.query("ROLLBACK");
				throw error;
			} finally {
				client.release();
			}
		},
	};
}
