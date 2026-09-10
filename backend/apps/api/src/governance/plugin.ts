import type { TenantScopedQueryable } from "@anxionos/database";
import type { PrincipalRepository } from "@anxionos/identity";
import type {
	AutonomyAssignmentRepository,
	CommandJournalRepository,
	GrantRepository,
	GovernanceUnitOfWork,
	TraversalEvaluator,
} from "@anxionos/governance";
import type {
	PrincipalLookup,
	createOrganizationsDb,
} from "@anxionos/organizations";
import type { betterAuth } from "better-auth";
import { Elysia } from "elysia";
import { mapGovernanceError } from "./error-handler";
import {
	authorizationCanBodySchema,
	handleAuthorizationCan,
} from "./handlers/authorization-can";
import {
	agentIdParamSchema,
	handleAssignAutonomy,
	handleEvaluateAutonomyCapability,
	evaluateAutonomyBodySchema,
	handleGetAutonomyMatrix,
	handleGetEffectiveAutonomy,
	handleTransitionAutonomy,
} from "./handlers/autonomy";
import {
	agencyIdParamSchema,
	grantIdParamSchema,
	handleIssueGrant,
	handleListGrants,
	handleRevokeGrant,
} from "./handlers/grants";
import { governanceOpenApi } from "../openapi-operations";
import { parseIdempotencyKey } from "../organizations/middleware/idempotency-key";
import { requireAgencyMembership } from "../organizations/middleware/require-agency-membership";
import { resolvePrincipalFromSession } from "../organizations/resolve-principal";

type OrganizationsDb = ReturnType<typeof createOrganizationsDb>;

export interface GovernancePluginDeps {
	auth: ReturnType<typeof betterAuth>;
	grantRepository: GrantRepository;
	autonomyAssignmentRepository: AutonomyAssignmentRepository;
	commandJournal: CommandJournalRepository;
	unitOfWork: GovernanceUnitOfWork;
	principalLookup: PrincipalLookup;
	membershipRepository: OrganizationsDb["membershipRepository"];
	scopedPool: TenantScopedQueryable;
	identityRepository: PrincipalRepository;
	traversalEvaluator: TraversalEvaluator;
}

function requestIdFrom(headers: Headers): string | undefined {
	return headers.get("x-request-id") ?? undefined;
}

async function resolveSessionPrincipal(
	deps: GovernancePluginDeps,
	request: Request,
) {
	const session = await deps.auth.api.getSession({ headers: request.headers });
	if (!session?.user?.id) {
		const { AppError } = await import("@anxionos/contracts/errors");
		throw AppError.unauthorized();
	}
	const principal = await resolvePrincipalFromSession(
		deps.identityRepository,
		session.user.id,
	);
	return { session, principal };
}

export function createGovernancePlugin(deps: GovernancePluginDeps) {
	const agencies = new Elysia({ name: "governance-agencies", prefix: "/v1/agencies" })
		.onError(({ error, set, request }) => {
			const mapped = mapGovernanceError(error, requestIdFrom(request.headers));
			set.status = mapped.status;
			return mapped.body;
		})
		.group("/:agencyId", (scoped) =>
			scoped
				.resolve(async ({ request, params }) => {
					const { agencyId } = agencyIdParamSchema.parse(params);
					const { principal } = await resolveSessionPrincipal(deps, request);
					await requireAgencyMembership(
						deps.scopedPool,
						agencyId,
						principal.id,
					);
					return { principal, agencyId };
				})
				.get(
					"/grants",
					({ principal, agencyId }) =>
						handleListGrants(deps, {
							agencyId,
							principalId: principal.id,
						}),
					governanceOpenApi.listGrants,
				)
				.post(
					"/grants",
					async ({ request, agencyId }) => {
					const commandId = parseIdempotencyKey(request.headers);
					const body = await request.json();
					return handleIssueGrant(deps, {
						commandId,
						agencyId,
						body,
					});
					},
					governanceOpenApi.issueGrant,
				)
				.delete(
					"/grants/:grantId",
					async ({ request, params, agencyId }) => {
					const { grantId } = grantIdParamSchema.parse(params);
					const commandId = parseIdempotencyKey(request.headers);
					const body =
						request.headers.get("content-length") === "0"
							? {}
							: await request.json();
					return handleRevokeGrant(deps, {
						commandId,
						agencyId,
						grantId,
						body,
					});
					},
					governanceOpenApi.revokeGrant,
				)
				.get(
					"/agents/:agentId/autonomy",
					({ agencyId, params }) => {
					const { agentId } = agentIdParamSchema.parse(params);
					return handleGetEffectiveAutonomy(deps, { agencyId, agentId });
					},
					governanceOpenApi.getAutonomy,
				)
				.post(
					"/agents/:agentId/autonomy",
					async ({ request, agencyId, params }) => {
					const { agentId } = agentIdParamSchema.parse(params);
					const commandId = parseIdempotencyKey(request.headers);
					const body = await request.json();
					return handleAssignAutonomy(deps, {
						commandId,
						agencyId,
						agentId,
						body,
					});
					},
					governanceOpenApi.assignAutonomy,
				)
				.post(
					"/agents/:agentId/autonomy/transition",
					async ({ request, agencyId, params, principal }) => {
						const { agentId } = agentIdParamSchema.parse(params);
						const commandId = parseIdempotencyKey(request.headers);
						const body = await request.json();
						return handleTransitionAutonomy(deps, {
							commandId,
							agencyId,
							agentId,
							actorPrincipalId: principal.id,
							body,
						});
					},
					governanceOpenApi.transitionAutonomy,
				),
		);

	const authorization = new Elysia({
		name: "governance-authorization",
		prefix: "/v1/governance",
	})
		.onError(({ error, set, request }) => {
			const mapped = mapGovernanceError(error, requestIdFrom(request.headers));
			set.status = mapped.status;
			return mapped.body;
		})
		.post(
			"/authorization/can",
			async ({ request }) => {
			const body = await request.json();
			const { principal } = await resolveSessionPrincipal(deps, request);
			const { agencyId } = authorizationCanBodySchema.parse(body);
			await requireAgencyMembership(
				deps.scopedPool,
				agencyId,
				principal.id,
			);
			return handleAuthorizationCan(deps, {
				principalId: principal.id,
				body,
			});
			},
			governanceOpenApi.authorizationCan,
		)
		.get(
			"/autonomy/matrix",
			async ({ request }) => {
			await resolveSessionPrincipal(deps, request);
			return handleGetAutonomyMatrix();
			},
			governanceOpenApi.autonomyMatrix,
		)
		.post(
			"/autonomy/evaluate",
			async ({ request }) => {
			const body = await request.json();
			const { principal } = await resolveSessionPrincipal(deps, request);
			const parsed = evaluateAutonomyBodySchema.parse(body);
			await requireAgencyMembership(
				deps.scopedPool,
				parsed.agencyId,
				principal.id,
			);
			return handleEvaluateAutonomyCapability(deps, { body });
			},
			governanceOpenApi.evaluateAutonomy,
		);

	return new Elysia({ name: "governance" }).use(agencies).use(authorization);
}
