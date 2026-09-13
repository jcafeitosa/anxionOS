/**
 * HTTP boundary proof for the agency agents collection (ANX-515).
 *
 * The test is opt-in through the shared destructive PostgreSQL harness guard.
 * It exercises the real Elysia route, Better Auth session boundary, identity
 * principal lookup, organizations membership lookup, and agents repository.
 */
import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	createScopedPool,
	type TenantScopedQueryable,
} from "@anxionos/database";
import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import {
	createIdentityDb,
	ensureIdentitySchema,
	registerPrincipal,
} from "@anxionos/identity";
import {
	createOrganizationsDb,
	ensureOrganizationsSchema,
} from "@anxionos/organizations";
import { Elysia } from "elysia";
import type { Pool } from "pg";
import { createAgentsApiRuntime } from "../../../apps/api/src/agents/bootstrap";
import { createAgentsPlugin } from "../../../apps/api/src/agents/plugin";
import {
	shouldRunPgIntegrationTests,
	truncateDomainTables,
} from "../../pg-harness-guard";
import { getDatabaseUrl } from "../test-support";

const TRUNCATE_SQL = `TRUNCATE agents_command_journal, agents_budget_policies,
	agents_routines, agents_agent_skill_bindings, agents_skill_versions,
	agents_skills, agents_agent_versions, agents_agents, organizations_memberships,
	organizations_owners, organizations_agencies, identity_sessions,
	identity_service_credentials, identity_service_identities, identity_principals,
	identity_command_journal, domain_journal, outbox CASCADE`;

const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function jsonRequest(
	path: string,
	headers: Record<string, string> = {},
): Request {
	return new Request(`http://127.0.0.1${path}`, {
		headers: { Accept: "application/json", ...headers },
	});
}

async function withCollectionHttpHarness(
	work: (input: {
		app: Elysia;
		pool: Pool;
		scopedPool: TenantScopedQueryable;
		authUserId: string;
		foreignAuthUserId: string;
	}) => Promise<void>,
) {
	if (!shouldRunPgIntegrationTests()) return;
	const url = getDatabaseUrl();
	if (!url) return;

	const pool = createPgPool(url);
	const scopedPool = createScopedPool({ connectionString: url, max: 4 });
	try {
		await ensureEventingSchema(pool);
		await ensureIdentitySchema(pool);
		await ensureOrganizationsSchema(pool);
		const agentsRuntime = createAgentsApiRuntime(pool);
		await truncateDomainTables(pool, TRUNCATE_SQL);

		const identityDb = createIdentityDb(pool);
		const organizationDb = createOrganizationsDb(pool);
		const authUserId = `auth-${randomUUID()}`;
		const foreignAuthUserId = `auth-${randomUUID()}`;
		const principal = await registerPrincipal(
			{
				repository: identityDb.repository,
				unitOfWork: identityDb.unitOfWork,
			},
			{ authUserId, email: "agents-owner@example.com" },
		);
		await registerPrincipal(
			{
				repository: identityDb.repository,
				unitOfWork: identityDb.unitOfWork,
			},
			{ authUserId: foreignAuthUserId, email: "agents-foreign@example.com" },
		);

		await organizationDb.membershipRepository.save({
			id: randomUUID(),
			agencyId,
			principalId: principal.id,
			role: "owner",
			status: "active",
			inviteEmail: null,
			inviteTokenHash: null,
			inviteExpiresAt: null,
			invitedAt: null,
			joinedAt: new Date(),
			revokedAt: null,
			revision: 1,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const app = new Elysia().use(
			createAgentsPlugin({
				auth: {
					api: {
						getSession: async ({ headers }: { headers: Headers }) => {
							const auth = headers.get("x-test-auth");
							return auth === authUserId || auth === foreignAuthUserId
								? { user: { id: auth } }
								: null;
						},
					},
				} as never,
				...agentsRuntime,
				membershipRepository: organizationDb.membershipRepository,
				scopedPool,
				identityRepository: identityDb.repository,
			}) as never,
		) as unknown as Elysia;

		await work({
			app,
			pool,
			scopedPool,
			authUserId,
			foreignAuthUserId,
		});
	} finally {
		await scopedPool.end();
		await pool.end();
	}
}

describe("agents collection HTTP boundary (ANX-515)", () => {
	test("returns the persisted agency collection and enforces session/membership", async () => {
		await withCollectionHttpHarness(
			async ({ app, pool, authUserId, foreignAuthUserId }) => {
				const agentId = randomUUID();
				const now = new Date();
				await pool.query(
					`INSERT INTO agents_agents
					 (id, tenant_id, organization_id, agency_id, kind, display_name, status, revision, created_at, updated_at)
					 VALUES ($1, $2, $2, $2, 'AGENCY', $3, 'DRAFT', 1, $4, $4)`,
					[agentId, agencyId, "Persisted API Agent", now],
				);

				const anonymous = await app.handle(
					jsonRequest(`/v1/agencies/${agencyId}/agents`),
				);
				expect(anonymous.status).toBe(401);

				const listed = await app.handle(
					jsonRequest(`/v1/agencies/${agencyId}/agents`, {
						"x-test-auth": authUserId,
					}),
				);
				expect(listed.status).toBe(200);
				expect(await listed.json()).toMatchObject({
					agents: [
						{
							id: agentId,
							organizationId: agencyId,
							agencyId,
							displayName: "Persisted API Agent",
						},
					],
				});

				const foreign = await app.handle(
					jsonRequest(`/v1/agencies/${agencyId}/agents`, {
						"x-test-auth": foreignAuthUserId,
					}),
				);
				expect(foreign.status).toBe(403);
			},
		);
	});
});
