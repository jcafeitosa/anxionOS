import { describe, expect, test } from "bun:test";
import { healthResponseSchema, schemaVersion } from "@anxionos/contracts";
import { createConnection } from "@anxionos/database";
import type { DomainJournal, Outbox } from "@anxionos/eventing";

describe("contracts", () => {
	test("exports schemaVersion", () => {
		expect(schemaVersion).toBe("0.1.0");
	});

	test("healthResponseSchema validates payload", () => {
		const parsed = healthResponseSchema.parse({
			status: "ok",
			schemaVersion,
			service: "api",
			timestamp: new Date().toISOString(),
			deps: {
				postgres: "ok",
				nats: "ok",
				neo4j: "ok",
			},
		});
		expect(parsed.status).toBe("ok");
		expect(parsed.deps.postgres).toBe("ok");
	});
});

describe("eventing ports", () => {
	test("journal and outbox are interface-only", () => {
		const journal: DomainJournal = { append: async () => {} };
		const outbox: Outbox = {
			enqueue: async () => {},
			markDispatched: async () => {},
		};
		expect(journal).toBeDefined();
		expect(outbox).toBeDefined();
	});
});

describe("database connection", () => {
	test("createConnection exposes pool and url", async () => {
		const conn = await createConnection({
			url: "postgres://user:pass@localhost:5432/anxionos",
		});
		expect(conn.url).toContain("postgres");
		expect(conn.pool).toBeDefined();
		await conn.close();
	});

	test("ping succeeds when DATABASE_URL is reachable", async () => {
		const url = process.env.DATABASE_URL;
		if (!url) {
			return;
		}
		const conn = await createConnection({ url });
		expect(await conn.ping()).toBe(true);
		await conn.close();
	});
});
