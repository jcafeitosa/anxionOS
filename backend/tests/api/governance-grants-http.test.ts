import { randomUUID } from "node:crypto";
import { describe, expect, test } from "bun:test";
import type { Principal } from "@anxionos/identity";
import { Elysia } from "elysia";
import { mapGovernanceError } from "../../apps/api/src/governance/error-handler";
import { handleIssueGrant } from "../../apps/api/src/governance/handlers/grants";
import { parseIdempotencyKey } from "../../apps/api/src/organizations/middleware/idempotency-key";
import { assertActorCanMutate } from "@anxionos/organizations";
import { createInMemoryPrincipalRepository } from "../identity/test-support";
import {
	createInMemoryApprovalRepository,
	createInMemoryAuthorityEpochStore,
	createInMemoryChangeProposalRepository,
	createInMemoryCommandJournalRepository,
	createInMemoryGrantRepository,
	createRecordingGovernanceUnitOfWork,
	createStubPrincipalLookup,
} from "../governance/test-support";
import { createInMemoryMembershipRepository } from "../organizations/test-support";
import type { Membership } from "../../modules/organizations/src/domain/entities/membership";
import type { Grant } from "../../modules/governance/src/domain/entities/grant";

/**
 * ANX-462 / ANX-466 — C1 (G5): evidência HTTP real via Elysia `app.handle`
 * em `POST /v1/agencies/:agencyId/grants`.
 *
 * Substitui o teatro de `mapGovernanceError(new GovernanceCommandError(...))`
 * em isolation: aqui a request atravessa session → papel de mutação →
 * `handleIssueGrant` → `onError`/`mapGovernanceError`, o mesmo encadeamento
 * da rota do plugin (sem PostgreSQL).
 *
 * C2 DiD platform-only: short-circuit no handler deve falhar em SCOPE_MISMATCH
 * (409) mesmo com actor owner — nunca degradar para 403 de papel/posse.
 * Este arquivo não expande 465/497/501.
 */

const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const operatorAuthUserId = "auth-operator-462-466";
const ownerAuthUserId = "auth-owner-462-466";
const operatorPrincipalId = "11111111-1111-4111-8111-111111111111";
const ownerPrincipalId = "22222222-2222-4222-8222-222222222222";
const granteePrincipalId = "33333333-3333-4333-8333-333333333333";

function principal(
	id: string,
	authUserId: string,
	email: string,
): Principal {
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

function createGrantsHttpApp(options: {
	authUserId: string | null;
	seedGrants?: Grant[];
	extraPrincipals?: string[];
}) {
	const identityRepository = createInMemoryPrincipalRepository([
		principal(operatorPrincipalId, operatorAuthUserId, "op@test.anxion.os"),
		principal(ownerPrincipalId, ownerAuthUserId, "owner@test.anxion.os"),
	]);
	const membershipRepository = createInMemoryMembershipRepository([
		membership("operator", operatorPrincipalId),
		membership("owner", ownerPrincipalId),
	]);
	const grantRepository = createInMemoryGrantRepository(
		options.seedGrants ?? [seedGrant()],
	);
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork } = createRecordingGovernanceUnitOfWork({
		grantRepository,
		changeProposalRepository: createInMemoryChangeProposalRepository(),
		approvalRepository: createInMemoryApprovalRepository(),
		authorityEpochStore: createInMemoryAuthorityEpochStore(),
		commandJournal,
	});
	const principalLookup = createStubPrincipalLookup([
		operatorPrincipalId,
		ownerPrincipalId,
		granteePrincipalId,
		...(options.extraPrincipals ?? []),
	]);

	const auth = {
		api: {
			getSession: async () => {
				if (!options.authUserId) return null;
				return {
					user: { id: options.authUserId },
					session: { token: "mock" },
				};
			},
		},
	};

	const deps = {
		grantRepository,
		commandJournal,
		unitOfWork,
		principalLookup,
	};

	const app = new Elysia({ name: "governance-grants-http-c1" })
		.onError(({ error, set, request }) => {
			const mapped = mapGovernanceError(
				error,
				request.headers.get("x-request-id") ?? undefined,
			);
			set.status = mapped.status;
			return mapped.body;
		})
		.post("/v1/agencies/:agencyId/grants", async ({ request, params }) => {
			const session = await auth.api.getSession();
			if (!session?.user?.id) {
				const { AppError } = await import("@anxionos/contracts/errors");
				throw AppError.unauthorized();
			}
			const routeAgencyId = String(params.agencyId);
			const actorPrincipal = await identityRepository.findByAuthUserId(
				session.user.id,
			);
			if (!actorPrincipal) {
				const { AppError } = await import("@anxionos/contracts/errors");
				throw AppError.unauthorized();
			}
			const mutating = await assertActorCanMutate(
				membershipRepository,
				actorPrincipal.id,
				routeAgencyId,
			);
			const commandId = parseIdempotencyKey(request.headers);
			const body = await request.json();
			return handleIssueGrant(deps, {
				commandId,
				agencyId: routeAgencyId,
				actor: { principalId: actorPrincipal.id, role: mutating.role },
				body,
			});
		});

	return { app, grantRepository };
}

function postGrant(body: Record<string, unknown>, idempotencyKey = randomUUID()) {
	return new Request(`http://localhost/v1/agencies/${agencyId}/grants`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"idempotency-key": idempotencyKey,
		},
		body: JSON.stringify(body),
	});
}

describe("ANX-462/466 — POST /grants HTTP (app.handle, C1)", () => {
	test("ANX-462 — console.platform em agency scope → 409 GOV_CAPABILITY_SCOPE_MISMATCH", async () => {
		const { app } = createGrantsHttpApp({
			authUserId: operatorAuthUserId,
		});
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
		// Short-circuit platform-only deve ir ao comando (scope), não a roleMayIssue.
		const { app, grantRepository } = createGrantsHttpApp({
			authUserId: ownerAuthUserId,
			seedGrants: [
				seedGrant({ capability: "owner.manage", granteePrincipalId: ownerPrincipalId }),
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
