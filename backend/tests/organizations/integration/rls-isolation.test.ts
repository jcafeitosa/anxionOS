import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { createScopedPool, runDatabaseMigrations } from "@anxionos/database";
import { ensureEventingSchema } from "@anxionos/eventing/postgres";
import {
	createAgency,
	createOrganizationUnitOfWork,
	createOrganizationsDb,
} from "@anxionos/organizations";
import {
	createStubPrincipalLookup,
	getDatabaseUrl,
	shouldRunPgIntegrationTests,
} from "../test-support";

const ORGANIZATIONS_TRUNCATE_SQL =
	"TRUNCATE organizations_command_journal, organizations_memberships, organizations_owners, organizations_agencies, domain_journal, outbox RESTART IDENTITY CASCADE";

describe("organizations RLS integration (ANX-256)", () => {
	test("RLS-ORG-01 cross-tenant SELECT on organizations_agencies denied", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		const url = getDatabaseUrl();
		if (!url) {
			return;
		}

		const scoped = createScopedPool({ connectionString: url, max: 4 });
		try {
			await runDatabaseMigrations(scoped.pool, {
				includeRoles: true,
				rolePassword:
					process.env.DATABASE_ROLE_PASSWORD ?? "change-me-in-production",
			});
			await ensureEventingSchema(scoped.pool);
			const { ensureOrganizationsSchema } = await import("@anxionos/organizations");
			await ensureOrganizationsSchema(scoped.pool);
			await scoped.pool.query(ORGANIZATIONS_TRUNCATE_SQL);

			const ownerPrincipalId = randomUUID();
			const orgDb = createOrganizationsDb(scoped.pool);
			const unitOfWork = createOrganizationUnitOfWork(scoped.pool);
			const created = await createAgency(
				{
					unitOfWork,
					commandJournal: orgDb.commandJournal,
					principalLookup: createStubPrincipalLookup([ownerPrincipalId]),
				},
				{
					commandId: randomUUID(),
					displayName: "RLS Test Agency",
					marketScope: "both",
					ownerPrincipalId,
				},
			);

			const foreignAgencyId = randomUUID();
			const foreignCount = await scoped.withContext(
				{ tenantId: foreignAgencyId, agencyId: foreignAgencyId },
				async (client) => {
					const result = await client.query(
						"SELECT count(*)::int AS count FROM organizations_agencies WHERE id = $1",
						[created.aggregateId],
					);
					return result.rows[0]?.count ?? 0;
				},
			);

			const ownCount = await scoped.withContext(
				{
					tenantId: created.aggregateId,
					agencyId: created.aggregateId,
				},
				async (client) => {
					const result = await client.query(
						"SELECT count(*)::int AS count FROM organizations_agencies WHERE id = $1",
						[created.aggregateId],
					);
					return result.rows[0]?.count ?? 0;
				},
			);

			expect(foreignCount).toBe(0);
			expect(ownCount).toBe(1);
		} finally {
			await scoped.end();
		}
	});

	test("RLS-ORG-02 platform context without tenant sees zero agency rows", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		const url = getDatabaseUrl();
		if (!url) {
			return;
		}

		const scoped = createScopedPool({ connectionString: url, max: 4 });
		try {
			await runDatabaseMigrations(scoped.pool, {
				includeRoles: true,
				rolePassword:
					process.env.DATABASE_ROLE_PASSWORD ?? "change-me-in-production",
			});
			await ensureEventingSchema(scoped.pool);
			const { ensureOrganizationsSchema } = await import("@anxionos/organizations");
			await ensureOrganizationsSchema(scoped.pool);
			await scoped.pool.query(ORGANIZATIONS_TRUNCATE_SQL);

			const ownerPrincipalId = randomUUID();
			const orgDb = createOrganizationsDb(scoped.pool);
			const unitOfWork = createOrganizationUnitOfWork(scoped.pool);
			await createAgency(
				{
					unitOfWork,
					commandJournal: orgDb.commandJournal,
					principalLookup: createStubPrincipalLookup([ownerPrincipalId]),
				},
				{
					commandId: randomUUID(),
					displayName: "Hidden Without Context",
					marketScope: "both",
					ownerPrincipalId,
				},
			);

			const count = await scoped.withPlatformContext(async (client) => {
				const result = await client.query(
					"SELECT count(*)::int AS count FROM organizations_agencies",
				);
				return result.rows[0]?.count ?? 0;
			});

			expect(count).toBe(0);
		} finally {
			await scoped.end();
		}
	});
});
