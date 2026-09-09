import { describe, expect, test } from "bun:test";
import {
	DEFAULT_OUTBOX_RELAY_BATCH_SIZE,
	DEFAULT_OUTBOX_RELAY_LEASE_TTL_MS,
	DEFAULT_OUTBOX_RELAY_POLL_INTERVAL_MS,
	loadOutboxRelayWorkerConfig,
	WORKER_PROFILE_OUTBOX_RELAY,
} from "../../apps/workers/src/config";

describe("workers outbox relay config", () => {
	test("loadOutboxRelayWorkerConfig reads env defaults", () => {
		const previousProfile = process.env.WORKER_PROFILE;
		const previousDatabaseUrl = process.env.DATABASE_URL;
		const previousNatsUrl = process.env.NATS_URL;
		process.env.WORKER_PROFILE = WORKER_PROFILE_OUTBOX_RELAY;
		process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/anxionos";
		process.env.NATS_URL = "nats://localhost:4222";
		delete process.env.OUTBOX_RELAY_POLL_INTERVAL_MS;
		delete process.env.OUTBOX_RELAY_BATCH_SIZE;
		delete process.env.OUTBOX_RELAY_LEASE_TTL_MS;

		try {
			const config = loadOutboxRelayWorkerConfig();
			expect(config.profile).toBe(WORKER_PROFILE_OUTBOX_RELAY);
			expect(config.pollIntervalMs).toBe(DEFAULT_OUTBOX_RELAY_POLL_INTERVAL_MS);
			expect(config.batchSize).toBe(DEFAULT_OUTBOX_RELAY_BATCH_SIZE);
			expect(config.leaseTtlMs).toBe(DEFAULT_OUTBOX_RELAY_LEASE_TTL_MS);
		} finally {
			if (previousProfile === undefined) {
				delete process.env.WORKER_PROFILE;
			} else {
				process.env.WORKER_PROFILE = previousProfile;
			}
			if (previousDatabaseUrl === undefined) {
				delete process.env.DATABASE_URL;
			} else {
				process.env.DATABASE_URL = previousDatabaseUrl;
			}
			if (previousNatsUrl === undefined) {
				delete process.env.NATS_URL;
			} else {
				process.env.NATS_URL = previousNatsUrl;
			}
		}
	});
});
