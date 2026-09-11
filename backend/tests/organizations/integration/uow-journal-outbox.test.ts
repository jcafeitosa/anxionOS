import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { ORGANIZATION_EVENT_TYPES } from "@anxionos/contracts/organizations";
import {
	createAgency,
	createAgencyCreatedEvent,
	createOrganizationsDb,
	createOrganizationUnitOfWork,
} from "@anxionos/organizations";
import {
	createStubPrincipalLookup,
	shouldRunPgIntegrationTests,
	withOrganizationsPgHarness,
} from "../test-support";

describe("organizations UoW journal+outbox integration (P-R5-06)", () => {
	test("createAgency persists state, command_journal, domain_journal and outbox atomically", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withOrganizationsPgHarness(async ({ pool }) => {
			const ownerPrincipalId = randomUUID();
			const commandId = randomUUID();
			const orgDb = createOrganizationsDb(pool);
			const unitOfWork = createOrganizationUnitOfWork(pool);

			const result = await createAgency(
				{
					unitOfWork,
					commandJournal: orgDb.commandJournal,
					principalLookup: createStubPrincipalLookup([ownerPrincipalId]),
				},
				{
					commandId,
					displayName: "Integration Agency",
					marketScope: "both",
					ownerPrincipalId,
				},
			);

			const agencyRows = await pool.query(
				"SELECT id, owner_principal_id FROM organizations_agencies WHERE id = $1",
				[result.aggregateId],
			);
			expect(agencyRows.rowCount).toBe(1);
			expect(agencyRows.rows[0]?.owner_principal_id).toBe(ownerPrincipalId);

			const commandJournalRows = await pool.query(
				"SELECT command_id, aggregate_id FROM organizations_command_journal WHERE command_id = $1",
				[commandId],
			);
			expect(commandJournalRows.rowCount).toBe(1);
			expect(commandJournalRows.rows[0]?.aggregate_id).toBe(result.aggregateId);

			const membershipRows = await pool.query(
				"SELECT count(*)::int AS count FROM organizations_memberships WHERE agency_id = $1 AND role = 'owner' AND status = 'active'",
				[result.aggregateId],
			);
			expect(membershipRows.rows[0]?.count).toBe(1);

			const domainJournalRows = await pool.query(
				"SELECT event_id, event_type FROM domain_journal WHERE owner_domain = 'organizations'",
			);
			expect(domainJournalRows.rowCount).toBeGreaterThan(0);
			expect(domainJournalRows.rows[0]?.event_type).toBe(
				ORGANIZATION_EVENT_TYPES.AGENCY_CREATED,
			);

			const outboxRows = await pool.query(
				"SELECT event_id, status FROM outbox WHERE owner_domain = 'organizations'",
			);
			expect(outboxRows.rowCount).toBe(domainJournalRows.rowCount);
			expect(outboxRows.rows[0]?.status).toBe("pending");

			const journalEventIds = domainJournalRows.rows.map(
				(row: { event_id: string }) => row.event_id,
			);
			const outboxEventIds = outboxRows.rows.map(
				(row: { event_id: string }) => row.event_id,
			);
			expect(outboxEventIds.sort()).toEqual(journalEventIds.sort());
		});
	});

	test("failed transaction rolls back state, command_journal, domain_journal and outbox", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withOrganizationsPgHarness(async ({ pool }) => {
			const unitOfWork = createOrganizationUnitOfWork(pool);
			const agencyId = randomUUID();
			const ownerPrincipalId = randomUUID();
			const commandId = randomUUID();
			const now = new Date();

			await expect(
				unitOfWork.runInTransaction(undefined, async (context) => {
					await context.agencyRepository.save({
						id: agencyId,
						ownerPrincipalId,
						displayName: "Rollback Agency",
						marketScope: "both",
						status: "draft",
						onboardingStep: "created",
						revision: 1,
						createdAt: now,
						updatedAt: now,
					});
					await context.commandJournal.record({
						commandId,
						commandName: "CreateAgency",
						aggregateId: agencyId,
						aggregateType: "Agency",
						revision: 1,
						responseSnapshot: { aggregateId: agencyId, revision: 1 },
					});
					await context.publishEvents([
						createAgencyCreatedEvent({
							agencyId,
							ownerPrincipalId,
							displayName: "Rollback Agency",
							marketScope: "both",
							status: "draft",
							onboardingStep: "created",
							revision: 1,
						}),
					]);
					throw new Error("simulated transaction failure");
				}),
			).rejects.toThrow("simulated transaction failure");

			const agencyCount = await pool.query(
				"SELECT count(*)::int AS count FROM organizations_agencies",
			);
			const commandJournalCount = await pool.query(
				"SELECT count(*)::int AS count FROM organizations_command_journal",
			);
			const domainJournalCount = await pool.query(
				"SELECT count(*)::int AS count FROM domain_journal WHERE owner_domain = 'organizations'",
			);
			const outboxCount = await pool.query(
				"SELECT count(*)::int AS count FROM outbox WHERE owner_domain = 'organizations'",
			);

			expect(agencyCount.rows[0]?.count).toBe(0);
			expect(commandJournalCount.rows[0]?.count).toBe(0);
			expect(domainJournalCount.rows[0]?.count).toBe(0);
			expect(outboxCount.rows[0]?.count).toBe(0);
		});
	});
});
