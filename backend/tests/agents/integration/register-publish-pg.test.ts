/**
 * ANX-139 / ANX-323 — Postgres integration for register + publish (G3-AGT-01/02).
 * Skipped unless RUN_PG_INTEGRATION_TESTS=true and DATABASE_URL set.
 */
import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	AgentsCommandJournalConflictError,
	ensureAgentsSchema,
	publishAgentVersion,
	registerAgent,
} from "@anxionos/agents";
import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import {
	createAgentsPgDeps,
	getDatabaseUrl,
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
			const { unitOfWork, commandJournal, agentRepository } =
				await createAgentsPgDeps(pool);
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
				{ unitOfWork, commandJournal, agentRepository },
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

	test("listByAgency applies organization and agency scope", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withAgentsPgHarness(async ({ pool }) => {
			const deps = await createAgentsPgDeps(pool);
			const organizationId = randomUUID();
			const otherOrganizationId = randomUUID();
			const agencyId = randomUUID();
			const otherAgencyId = randomUUID();

			const included = await registerAgent(deps, {
				commandId: randomUUID(),
				displayName: "Included Agency Agent",
				kind: "AGENCY",
				agencyId,
				organizationId,
			});
			await registerAgent(deps, {
				commandId: randomUUID(),
				displayName: "Other Agency Agent",
				kind: "AGENCY",
				agencyId: otherAgencyId,
				organizationId,
			});
			await registerAgent(deps, {
				commandId: randomUUID(),
				displayName: "Other Organization Agent",
				kind: "AGENCY",
				agencyId,
				organizationId: otherOrganizationId,
			});

			const listed = await deps.agentRepository.listByAgency({
				organizationId,
				agencyId,
			});

			expect(listed.map((agent) => agent.id)).toEqual([included.aggregateId]);
			expect(listed[0]?.displayName).toBe("Included Agency Agent");
		});
	});

	test("same commandId concurrent registration applies exactly once", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		const databaseUrl = getDatabaseUrl();
		if (!databaseUrl) return;
		const pool = createPgPool(databaseUrl);
		try {
			await ensureEventingSchema(pool);
			await ensureAgentsSchema(pool);
			for (let round = 0; round < 5; round += 1) {
				const { unitOfWork, commandJournal } = await createAgentsPgDeps(pool);
				const organizationId = randomUUID();
				const commandId = randomUUID();
				const outcomes = await Promise.allSettled([
					registerAgent(
						{ unitOfWork, commandJournal },
						{
							commandId,
							displayName: `Concurrent Agent ${round}`,
							kind: "PLATFORM",
							organizationId,
						},
					),
					registerAgent(
						{ unitOfWork, commandJournal },
						{
							commandId,
							displayName: `Concurrent Agent ${round}`,
							kind: "PLATFORM",
							organizationId,
						},
					),
				]);

				const fulfilled = outcomes.filter(
					(outcome) => outcome.status === "fulfilled",
				);
				const rejected = outcomes.filter(
					(outcome) => outcome.status === "rejected",
				);
				expect(fulfilled.length).toBeGreaterThanOrEqual(1);
				expect(rejected.length).toBeLessThanOrEqual(1);
				if (rejected[0]?.status === "rejected") {
					expect(rejected[0].reason).toBeInstanceOf(
						AgentsCommandJournalConflictError,
					);
				}
				const successfulResults = outcomes.flatMap((outcome) =>
					outcome.status === "fulfilled" ? [outcome.value] : [],
				);
				expect(
					new Set(successfulResults.map((result) => result.aggregateId)).size,
				).toBe(1);
				if (successfulResults.length === 2) {
					expect(
						successfulResults.filter((result) => result.idempotentReplay),
					).toHaveLength(1);
				}

				const agents = await pool.query(
					"SELECT count(*)::int AS count FROM agents_agents WHERE organization_id = $1",
					[organizationId],
				);
				const journal = await pool.query(
					"SELECT count(*)::int AS count FROM agents_command_journal WHERE tenant_id = $1 AND command_id = $2",
					[organizationId, commandId],
				);
				expect(agents.rows[0]?.count).toBe(1);
				expect(journal.rows[0]?.count).toBe(1);
				await pool.query(
					"DELETE FROM agents_command_journal WHERE tenant_id = $1 AND command_id = $2",
					[organizationId, commandId],
				);
				await pool.query(
					"DELETE FROM agents_agents WHERE organization_id = $1",
					[organizationId],
				);
			}
		} finally {
			await pool.end();
		}
	});
});
