import { describe, expect, test } from "bun:test";
import { AckPolicy, DeliverPolicy, JSONCodec, connect } from "nats";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { IDENTITY_EVENT_TYPES } from "@anxionos/contracts/identity";
import {
	createSessionRevocationConsumerDeps,
	IDENTITY_SESSIONS_CONSUMER_NAME,
	processIdentitySessionEvent,
} from "../../apps/api/src/identity/session-revocation-consumer";
import {
	DEFAULT_NATS_EVENTS_STREAM,
	ensureEventsJetStream,
} from "../../apps/api/src/identity/bootstrap-session-revocation";
import { resolveEventSubject } from "@anxionos/eventing/nats-publisher";
import {
	getNatsUrl,
	shouldRunNatsIntegrationTests,
	shouldRunPgIntegrationTests,
	withSessionRevocationPgHarness,
} from "./test-support";

const principalId = "11111111-1111-4111-8111-111111111111";
const authUserId = "auth-user-1";

function createSuspendedEnvelope(): DomainEventEnvelope {
	return {
		eventId: crypto.randomUUID(),
		schemaVersion: "0.1.0",
		ownerDomain: "identity",
		eventType: IDENTITY_EVENT_TYPES.PRINCIPAL_SUSPENDED,
		occurredAt: "2026-09-08T12:00:00.000Z",
		payload: {
			principalId,
			reasonCode: "ops.manual",
			suspendedAt: "2026-09-08T12:00:00.000Z",
		},
	};
}

async function seedSuspendedPrincipalWithSessions(
	pool: { query: (sql: string, params?: unknown[]) => Promise<{ rowCount: number | null; rows: { consumer_name?: string }[] }> },
): Promise<void> {
	await pool.query(
		`INSERT INTO "user" (id, name, email, "emailVerified")
		 VALUES ($1, $2, $3, TRUE)`,
		[authUserId, "Owner", "owner@example.com"],
	);
	await pool.query(
		`INSERT INTO identity_principals (id, auth_user_id, email, status, suspended_at, suspension_reason)
		 VALUES ($1, $2, $3, 'suspended', $4, $5)`,
		[
			principalId,
			authUserId,
			"owner@example.com",
			new Date("2026-09-08T12:00:00.000Z"),
			"ops.manual",
		],
	);
	const sessionCreatedAt = new Date("2026-09-08T12:00:00.000Z");
	await pool.query(
		`INSERT INTO session (id, "expiresAt", token, "createdAt", "updatedAt", "userId")
		 VALUES ($1, $2, $3, $4, $4, $5), ($6, $7, $8, $4, $4, $5)`,
		[
			"sess-1",
			new Date("2027-01-01T00:00:00.000Z"),
			"token-1",
			sessionCreatedAt,
			authUserId,
			"sess-2",
			new Date("2027-01-01T00:00:00.000Z"),
			"token-2",
		],
	);
}

describe("session revocation consumer postgres integration", () => {
	test("processIdentitySessionEvent revokes Better Auth sessions for suspended principal", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withSessionRevocationPgHarness(async ({ pool }) => {
			await seedSuspendedPrincipalWithSessions(pool);
			const deps = createSessionRevocationConsumerDeps(pool);
			const suspendedEnvelope = createSuspendedEnvelope();

			const first = await processIdentitySessionEvent(pool, deps, suspendedEnvelope);
			const second = await processIdentitySessionEvent(pool, deps, suspendedEnvelope);

			expect(first).toBe("processed");
			expect(second).toBe("skipped");

			const sessions = await pool.query('SELECT id FROM session WHERE "userId" = $1', [
				authUserId,
			]);
			expect(sessions.rowCount).toBe(0);

			const inbox = await pool.query(
				"SELECT consumer_name FROM inbox WHERE event_id = $1",
				[suspendedEnvelope.eventId],
			);
			expect(inbox.rowCount).toBe(1);
			expect(inbox.rows[0]?.consumer_name).toBe(IDENTITY_SESSIONS_CONSUMER_NAME);
		});
	});

	test("processIdentitySessionEvent ignores active principals", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withSessionRevocationPgHarness(async ({ pool }) => {
			await pool.query(
				`INSERT INTO "user" (id, name, email, "emailVerified")
				 VALUES ($1, $2, $3, TRUE)`,
				[authUserId, "Owner", "owner@example.com"],
			);
			await pool.query(
				`INSERT INTO identity_principals (id, auth_user_id, email, status)
				 VALUES ($1, $2, $3, 'active')`,
				[principalId, authUserId, "owner@example.com"],
			);
			const sessionCreatedAt = new Date("2026-09-08T12:00:00.000Z");
			await pool.query(
				`INSERT INTO session (id, "expiresAt", token, "createdAt", "updatedAt", "userId")
				 VALUES ($1, $2, $3, $4, $4, $5)`,
				["sess-1", new Date("2027-01-01T00:00:00.000Z"), "token-1", sessionCreatedAt, authUserId],
			);

			const deps = createSessionRevocationConsumerDeps(pool);
			await processIdentitySessionEvent(pool, deps, createSuspendedEnvelope());

			const sessions = await pool.query('SELECT id FROM session WHERE "userId" = $1', [
				authUserId,
			]);
			expect(sessions.rowCount).toBe(1);
		});
	});
});

describe("session revocation consumer nats integration", () => {
	test("JetStream delivers principal.suspended to identity-sessions durable consumer", async () => {
		if (!shouldRunNatsIntegrationTests()) {
			return;
		}

		const natsUrl = getNatsUrl();
		if (!natsUrl) {
			return;
		}

		const streamName = process.env.NATS_EVENTS_STREAM?.trim() ?? DEFAULT_NATS_EVENTS_STREAM;
		const durable = `identity_sessions_test_${crypto.randomUUID().replace(/-/g, "")}`;
		const suspendedEnvelope = createSuspendedEnvelope();
		const subject = resolveEventSubject(suspendedEnvelope.eventType);
		const codec = JSONCodec<DomainEventEnvelope>();

		await withSessionRevocationPgHarness(async ({ pool }) => {
			await seedSuspendedPrincipalWithSessions(pool);

			const nc = await connect({ servers: natsUrl });
			const jsm = await nc.jetstreamManager();
			await ensureEventsJetStream(jsm, streamName);

			const js = nc.jetstream();
			try {
				await jsm.consumers.add(streamName, {
					durable_name: durable,
					filter_subject: subject,
					ack_policy: AckPolicy.Explicit,
					deliver_policy: DeliverPolicy.New,
				});
			} catch {
				// consumer may already exist from a prior failed run
			}
			const consumer = await js.consumers.get(streamName, durable);

			await js.publish(subject, codec.encode(suspendedEnvelope));

			const deps = createSessionRevocationConsumerDeps(pool);
			const messages = await consumer.fetch({ max_messages: 1, expires: 5_000 });
			for await (const msg of messages) {
				const envelope = codec.decode(msg.data);
				await processIdentitySessionEvent(pool, deps, envelope);
				msg.ack();
			}

			const sessions = await pool.query('SELECT id FROM session WHERE "userId" = $1', [
				authUserId,
			]);
			expect(sessions.rowCount).toBe(0);

			try {
				await jsm.consumers.delete(streamName, durable);
			} catch {
				// best-effort cleanup
			}
			await nc.drain();
		});
	});
});
