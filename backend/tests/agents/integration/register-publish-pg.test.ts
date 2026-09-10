/**
 * ANX-139 / ANX-323 — Postgres integration for register + publish (G3-AGT-01/02).
 * Skipped unless RUN_PG_INTEGRATION_TESTS=true and DATABASE_URL set.
 */
import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { publishAgentVersion, registerAgent } from "@anxionos/agents";
import {
	createAgentsPgDeps,
	shouldRunPgIntegrationTests,
	withAgentsPgHarness,
} from "../test-support";

const instructionRef = {
	bucket: "agents-instructions",
	key: "org/test/instruction-v1.json",
	contentHash: "sha256:abc123",
};

describe("agents register/publish against real Postgres (ANX-323)", () => {
	test("registerAgent persists agent row and command journal idempotency", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withAgentsPgHarness(async ({ pool }) => {
			const { unitOfWork, commandJournal } = await createAgentsPgDeps(pool);
			const organizationId = randomUUID();
			const commandId = randomUUID();

			const first = await registerAgent(
				{ unitOfWork, commandJournal },
				{
					commandId,
					displayName: "PG Agent",
					kind: "PLATFORM",
					organizationId,
				},
			);
			const second = await registerAgent(
				{ unitOfWork, commandJournal },
				{
					commandId,
					displayName: "PG Agent",
					kind: "PLATFORM",
					organizationId,
				},
			);
			expect(second).toEqual({ ...first, idempotentReplay: true });

			const rows = await pool.query(
				"SELECT count(*)::int AS count FROM agents_agents WHERE organization_id = $1",
				[organizationId],
			);
			expect(rows.rows[0]?.count).toBe(1);

			const journalRows = await pool.query(
				"SELECT count(*)::int AS count FROM agents_command_journal WHERE command_id = $1",
				[commandId],
			);
			expect(journalRows.rows[0]?.count).toBe(1);
		});
	});

	test("publishAgentVersion writes version row and outbox event", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withAgentsPgHarness(async ({ pool }) => {
			const { unitOfWork, commandJournal } = await createAgentsPgDeps(pool);
			const organizationId = randomUUID();

			const registered = await registerAgent(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					displayName: "Publish PG Agent",
					kind: "PLATFORM",
					organizationId,
				},
			);

			const published = await publishAgentVersion(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					agentId: registered.aggregateId,
					versionNumber: 1,
					expectedRevision: 1,
					instructionRef,
					skillRefs: [],
					capabilityManifestHash: "sha256:manifest-pg",
					modelSlots: [],
					autonomyLevel: "L1",
				},
			);
			expect(published.revision).toBe(2);

			const versionRows = await pool.query(
				"SELECT status FROM agents_agent_versions WHERE id = $1",
				[published.aggregateId],
			);
			expect(versionRows.rows[0]?.status).toBe("published");

			const outboxRows = await pool.query(
				"SELECT count(*)::int AS count FROM outbox WHERE owner_domain = 'agents' AND event_type = 'agents.agent_version.published.v1'",
			);
			expect(outboxRows.rows[0]?.count).toBeGreaterThanOrEqual(1);
		});
	});
});
