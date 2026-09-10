import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { GOVERNANCE_EVENT_TYPES } from "@anxionos/contracts/governance";
import {
	assignAutonomyLevel,
	createGovernanceDb,
	createGovernanceUnitOfWork,
	transitionAutonomyLevel,
} from "@anxionos/governance";
import {
	assertPgIntegrationEnvForCi,
	getPgIntegrationTestSkipReason,
	withGovernancePgHarness,
} from "../test-support";

assertPgIntegrationEnvForCi();
const pgIntegrationSkipReason = getPgIntegrationTestSkipReason();

describe("governance autonomy persistence (slice 4 — migration 0005 + UoW)", () => {
	test.skipIf(Boolean(pgIntegrationSkipReason))("ensureGovernanceSchema creates governance_autonomy_assignments table", async () => {
		await withGovernancePgHarness(async ({ pool }) => {
			const tableRows = await pool.query(
				`SELECT column_name
         FROM information_schema.columns
         WHERE table_name = 'governance_autonomy_assignments'
         ORDER BY ordinal_position`,
			);
			expect(tableRows.rowCount).toBeGreaterThan(0);
			const columnNames = tableRows.rows.map(
				(row: { column_name: string }) => row.column_name,
			);
			expect(columnNames).toContain("tenant_id");
			expect(columnNames).toContain("agency_id");
			expect(columnNames).toContain("scope_id");
			expect(columnNames).toContain("subject_agent_id");
			expect(columnNames).toContain("level");
			expect(columnNames).toContain("status");
			expect(columnNames).toContain("revision");
		});
	});

	test.skipIf(Boolean(pgIntegrationSkipReason))("assignAutonomyLevel persists assignment, command_journal, domain_journal and outbox", async () => {
		await withGovernancePgHarness(async ({ pool }) => {
			const scopeId = randomUUID();
			const subjectAgentId = randomUUID();
			const commandId = randomUUID();
			const govDb = createGovernanceDb(pool);
			const unitOfWork = createGovernanceUnitOfWork(pool);

			const result = await assignAutonomyLevel(
				{
					unitOfWork,
					commandJournal: govDb.commandJournal,
				},
				{
					commandId,
					scopeId,
					subjectAgentId,
					level: "L0",
				},
			);

			const assignmentRows = await pool.query(
				`SELECT id, level, status, revision
         FROM governance_autonomy_assignments
         WHERE id = $1`,
				[result.aggregateId],
			);
			expect(assignmentRows.rowCount).toBe(1);
			expect(assignmentRows.rows[0]?.level).toBe("L0");
			expect(assignmentRows.rows[0]?.status).toBe("active");
			expect(assignmentRows.rows[0]?.revision).toBe(1);

			const commandJournalRows = await pool.query(
				`SELECT command_id, aggregate_id
         FROM governance_command_journal
         WHERE command_id = $1`,
				[commandId],
			);
			expect(commandJournalRows.rowCount).toBe(1);
			expect(commandJournalRows.rows[0]?.aggregate_id).toBe(result.aggregateId);

			const domainJournalRows = await pool.query(
				`SELECT event_type FROM domain_journal WHERE owner_domain = 'governance'`,
			);
			expect(domainJournalRows.rowCount).toBeGreaterThan(0);
			expect(
				domainJournalRows.rows.some(
					(row: { event_type: string }) =>
						row.event_type === GOVERNANCE_EVENT_TYPES.AUTONOMY_ASSIGNED,
				),
			).toBe(true);

			const outboxRows = await pool.query(
				`SELECT status FROM outbox WHERE owner_domain = 'governance'`,
			);
			expect(outboxRows.rowCount).toBe(domainJournalRows.rowCount);
			expect(outboxRows.rows[0]?.status).toBe("pending");
		});
	});

	test.skipIf(Boolean(pgIntegrationSkipReason))("transitionAutonomyLevel demote supersedes prior row and inserts new active assignment", async () => {
		await withGovernancePgHarness(async ({ pool }) => {
			const scopeId = randomUUID();
			const subjectAgentId = randomUUID();
			const actorPrincipalId = randomUUID();
			const approvalId = randomUUID();
			const govDb = createGovernanceDb(pool);
			const unitOfWork = createGovernanceUnitOfWork(pool);
			const deps = {
				unitOfWork,
				commandJournal: govDb.commandJournal,
			};

			await assignAutonomyLevel(deps, {
				commandId: randomUUID(),
				scopeId,
				subjectAgentId,
				level: "L0",
			});
			await transitionAutonomyLevel(deps, {
				commandId: randomUUID(),
				scopeId,
				subjectAgentId,
				targetLevel: "L1",
				transitionKind: "promote",
				approvalId,
				evidenceHash: "sha256:promote-l1",
				actorPrincipalId,
			});
			await transitionAutonomyLevel(deps, {
				commandId: randomUUID(),
				scopeId,
				subjectAgentId,
				targetLevel: "L2",
				transitionKind: "promote",
				approvalId,
				evidenceHash: "sha256:promote-l2",
				actorPrincipalId,
			});

			const demoteResult = await transitionAutonomyLevel(deps, {
				commandId: randomUUID(),
				scopeId,
				subjectAgentId,
				targetLevel: "L1",
				transitionKind: "demote",
				actorPrincipalId,
			});

			const activeRows = await pool.query(
				`SELECT id, level, status, revision
         FROM governance_autonomy_assignments
         WHERE scope_id = $1 AND subject_agent_id = $2 AND status = 'active'`,
				[scopeId, subjectAgentId],
			);
			expect(activeRows.rowCount).toBe(1);
			expect(activeRows.rows[0]?.id).toBe(demoteResult.aggregateId);
			expect(activeRows.rows[0]?.level).toBe("L1");

			const supersededRows = await pool.query(
				`SELECT count(*)::int AS count
         FROM governance_autonomy_assignments
         WHERE scope_id = $1 AND subject_agent_id = $2 AND status = 'superseded'`,
				[scopeId, subjectAgentId],
			);
			expect(supersededRows.rows[0]?.count).toBe(3);
		});
	});
});
