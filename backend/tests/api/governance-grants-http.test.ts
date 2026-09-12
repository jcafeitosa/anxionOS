import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, mock, test } from "bun:test";
import type { Principal } from "@anxionos/identity";
import {
	createGraphT01TraversalEvaluator,
} from "@anxionos/governance";
import type { Membership } from "../../modules/organizations/src/domain/entities/membership";
import type { Grant } from "../../modules/governance/src/domain/entities/grant";
import { createInMemoryPrincipalRepository } from "../identity/test-support";
import {
	createInMemoryApprovalRepository,
	createInMemoryAuthorityEpochStore,
	createInMemoryAutonomyAssignmentRepository,
	createInMemoryChangeProposalRepository,
	createInMemoryCommandJournalRepository,
	createInMemoryGrantRepository,
	createRecordingGovernanceUnitOfWork,
	createStubPrincipalLookup,
} from "../governance/test-support";
import {
	createInMemoryAgencyRepository,
	createInMemoryMembershipRepository,
} from "../organizations/test-support";

/**
 * ANX-462 / ANX-466 — C1: evidência HTTP via **createGovernancePlugin** prod
 * (`app.handle` POST /v1/agencies/:agencyId/grants).
 *
 * `runAgencyScopedRead` é mockado só para injetar membership in-memory
 * (sem PG); o plugin Elysia, handlers e error mapper são os de produção.
 *
 * C2 DiD: owner + console.platform em agency → 409 SCOPE + zero write.
 */

const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const operatorAuthUserId = "auth-operator-462-466";
const ownerAuthUserId = "auth-owner-462-466";
const operatorPrincipalId = "11111111-1111-4111-8111-111111111111";
const ownerPrincipalId = "22222222-2222-4222-8222-222222222222";
const granteePrincipalId = "33333333-3333-4333-8333-333333333333";

let createGovernancePlugin: typeof import("../../apps/api/src/governance/plugin").createGovernancePlugin;
let membershipRepository = createInMemoryMembershipRepository();

function principal(id: string, authUserId: string, email: string): Principal {
	return {
		id,
		authUserId,
		email,
		kind: "human",
		status: "active",
		revision: 1,
		createdAt: new Date("2026-09-12T00:00:00.000Z"),
		suspendedAt: null,
		suspensionReason: null,
		revokedAt: null,
		revocationReason: null,
	};
}

function membership(
	role: Membership["role"],
	principalId: string,
): Membership {
	const now = new Date("2026-09-12T00:00:00.000Z");
	return {
		id: `${role}-${principalId}`,
		agencyId,
		principalId,
		inviteEmail: null,
		inviteTokenHash: null,
		inviteExpiresAt: null,
		role,
		status: "active",
		invitedAt: null,
		joinedAt: now,
		revokedAt: null,
		revision: 1,
		createdAt: now,
		updatedAt: now,
	};
}

function seedGrant(overrides: Partial<Grant> = {}): Grant {
	const now = new Date("2026-09-12T00:00:00.000Z");
	return {
		id: randomUUID(),
		tenantId: agencyId,
		agencyId,
		scopeId: agencyId,
		scopeKind: "agency",
		granteePrincipalId: ownerPrincipalId,
		granteeAgentId: null,
		issuedByPrincipalId: null,
		capability: "owner.manage",
		resourceRef: null,
		status: "active",
		validFrom: now,
		validUntil: null,
		derivedFromMembershipId: null,
		authorityEpochAtIssue: 1,
		revision: 1,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

beforeAll(async () => {
	membershipRepository = createInMemoryMembershipRepository([
		membership("operator", operatorPrincipalId),
		membership("owner", ownerPrincipalId),
	]);
	const agencyRepository = createInMemoryAgencyRepository();

	mock.module("../../apps/api/src/middleware/resolve-tenant-context", () => ({
		runAgencyScopedRead: async (
			_scopedPool: unknown,
			_agencyId: string,
			_principalId: string,
			work: (repos: {
				agencyRepository: typeof agencyRepository;
				membershipRepository: typeof membershipRepository;
			}) => Promise<unknown>,
		) =>
			work({
				agencyRepository,
				membershipRepository,
			}),
		resolveAgencyTenantContext: (a: string, p: string) => ({
			tenantId: a,
			agencyId: a,
			principalId: p,
		}),
		buildAgencyTenantContext: (a: string, p: string) => ({
			tenantId: a,
			agencyId: a,
			principalId: p,
		}),
		buildAgencyBootstrapContext: () => ({}),
		resolveAgencyNatsSubjectPrefix: (a: string) => `agency.${a}.events.`,
		resolveAgencyGraphScope: (a: string, p: string) => ({
			principalId: p,
			actingScope: { scopeType: "AGENCY", scopeId: a },
		}),
	}));

	({ createGovernancePlugin } = await import(
		"../../apps/api/src/governance/plugin"
	));
});

function createGrantsHttpApp(options: {
	authUserId: string | null;
	seedGrants?: Grant[];
}) {
	membershipRepository = createInMemoryMembershipRepository([
		membership("operator", operatorPrincipalId),
		membership("owner", ownerPrincipalId),
	]);

	const identityRepository = createInMemoryPrincipalRepository([
		principal(operatorPrincipalId, operatorAuthUserId, "op@test.anxion.os"),
		principal(ownerPrincipalId, ownerAuthUserId, "owner@test.anxion.os"),
	]);
	const grantRepository = createInMemoryGrantRepository(
		options.seedGrants ?? [seedGrant()],
	);
	const changeProposalRepository = createInMemoryChangeProposalRepository();
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork } = createRecordingGovernanceUnitOfWork({
		grantRepository,
		changeProposalRepository,
		approvalRepository: createInMemoryApprovalRepository(),
		authorityEpochStore: createInMemoryAuthorityEpochStore(),
		commandJournal,
	});

	const auth = {
		api: {
			getSession: async ({ headers }: { headers: Headers }) => {
				if (!options.authUserId) return null;
				// Better Auth shape; cookie optional for this harness
				void headers;
				return {
					user: { id: options.authUserId },
					session: { token: "mock" },
				};
			},
		},
	};

	const scopedPool = {
		withContext: async () => {
			throw new Error("scopedPool.withContext should not run — runAgencyScopedRead is mocked");
		},
		end: async () => {},
	};

	const traversalEvaluator = createGraphT01TraversalEvaluator({
		async queryPaths() {
			return [];
		},
	} as never);

	const app = createGovernancePlugin({
		auth: auth as never,
		grantRepository,
		changeProposalRepository,
		autonomyAssignmentRepository: createInMemoryAutonomyAssignmentRepository(),
		commandJournal,
		unitOfWork,
		principalLookup: createStubPrincipalLookup([
			operatorPrincipalId,
			ownerPrincipalId,
			granteePrincipalId,
		]),
		membershipRepository,
		scopedPool: scopedPool as never,
		identityRepository,
		traversalEvaluator,
	});

	return { app, grantRepository };
}

function postGrant(
	body: Record<string, unknown>,
	idempotencyKey = randomUUID(),
) {
	return new Request(`http://localhost/v1/agencies/${agencyId}/grants`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"idempotency-key": idempotencyKey,
		},
		body: JSON.stringify(body),
	});
}

describe("ANX-462/466 — POST /grants via createGovernancePlugin (C1)", () => {
	test("ANX-462 — console.platform em agency scope → 409 GOV_CAPABILITY_SCOPE_MISMATCH", async () => {
		const { app } = createGrantsHttpApp({ authUserId: operatorAuthUserId });
		const response = await app.handle(
			postGrant({
				granteePrincipalId: operatorPrincipalId,
				capability: "console.platform",
			}),
		);
		const json = await response.json();
		expect(response.status).toBe(409);
		expect(json.error.details.code).toBe("GOV_CAPABILITY_SCOPE_MISMATCH");
	});

	test("ANX-466 — operator não emite identity.admin → 403 GOV_INSUFFICIENT_AUTHORITY", async () => {
		const { app } = createGrantsHttpApp({ authUserId: operatorAuthUserId });
		const response = await app.handle(
			postGrant({
				granteePrincipalId: operatorPrincipalId,
				capability: "identity.admin",
			}),
		);
		const json = await response.json();
		expect(response.status).toBe(403);
		expect(json.error.details.code).toBe("GOV_INSUFFICIENT_AUTHORITY");
	});

	test("ANX-466 — capability desconhecida → 400 GOV_CAPABILITY_UNKNOWN (antes de authz)", async () => {
		const { app } = createGrantsHttpApp({ authUserId: operatorAuthUserId });
		const response = await app.handle(
			postGrant({
				granteePrincipalId: granteePrincipalId,
				capability: "identity.superadmin.takeover",
			}),
		);
		const json = await response.json();
		expect(response.status).toBe(400);
		expect(json.error.details.code).toBe("GOV_CAPABILITY_UNKNOWN");
	});

	test("ANX-466 — owner sem posse não repassa identity.admin → 403", async () => {
		const { app } = createGrantsHttpApp({
			authUserId: ownerAuthUserId,
			seedGrants: [seedGrant({ capability: "owner.manage" })],
		});
		const response = await app.handle(
			postGrant({
				granteePrincipalId: operatorPrincipalId,
				capability: "identity.admin",
			}),
		);
		const json = await response.json();
		expect(response.status).toBe(403);
		expect(json.error.details.code).toBe("GOV_INSUFFICIENT_AUTHORITY");
	});

	test("C2 DiD — owner + console.platform em agency → 409 SCOPE (não 403 role)", async () => {
		const { app, grantRepository } = createGrantsHttpApp({
			authUserId: ownerAuthUserId,
			seedGrants: [
				seedGrant({
					capability: "owner.manage",
					granteePrincipalId: ownerPrincipalId,
				}),
				seedGrant({
					capability: "identity.admin",
					granteePrincipalId: ownerPrincipalId,
				}),
			],
		});
		const before = await grantRepository.listActiveByPrincipal(ownerPrincipalId);
		const response = await app.handle(
			postGrant({
				granteePrincipalId: ownerPrincipalId,
				capability: "console.platform",
			}),
		);
		const json = await response.json();
		expect(response.status).toBe(409);
		expect(json.error.details.code).toBe("GOV_CAPABILITY_SCOPE_MISMATCH");
		const after = await grantRepository.listActiveByPrincipal(ownerPrincipalId);
		expect(after).toHaveLength(before.length);
	});

	test("sem sessão → 401", async () => {
		const { app } = createGrantsHttpApp({ authUserId: null });
		const response = await app.handle(
			postGrant({
				granteePrincipalId: granteePrincipalId,
				capability: "agents.budget.manage",
			}),
		);
		expect(response.status).toBe(401);
	});
});
