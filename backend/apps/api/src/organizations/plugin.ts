import type { TenantScopedQueryable } from "@anxionos/database";
import type { PrincipalRepository } from "@anxionos/identity";
import type {
	createHmacInviteTokenHasherFromEnv,
	createIdentityPrincipalLookup,
	createOrganizationsDb,
	createOrganizationUnitOfWork,
} from "@anxionos/organizations";
import type { betterAuth } from "better-auth";
import { Elysia } from "elysia";
import { organizationsOpenApi } from "../openapi-operations";
import { resolveClientIp } from "./client-ip";
import { mapOrganizationsError } from "./error-handler";
import {
	handleCreateAgency,
	handleGetAgency,
	handleListAgencies,
	handleTransferOwnership,
	handleUpdateAgencyMarkets,
} from "./handlers/agencies";
import { handleAcceptInvite } from "./handlers/invites";
import {
	handleActivateMembership,
	handleGetMembership,
	handleInviteMember,
	handleListMemberships,
	handleRevokeMembership,
} from "./handlers/memberships";
import { parseIdempotencyKey } from "./middleware/idempotency-key";
import { requireAgencyMembership } from "./middleware/require-agency-membership";
import { requireAgencyMutationRole } from "./middleware/require-agency-mutation-role";
import { assertInviteAcceptRateLimit } from "./rate-limit";
import { resolvePrincipalFromSession } from "./resolve-principal";

type OrganizationsDb = ReturnType<typeof createOrganizationsDb>;
type OrganizationUnitOfWork = ReturnType<typeof createOrganizationUnitOfWork>;
type PrincipalLookup = ReturnType<typeof createIdentityPrincipalLookup>;
type InviteTokenHasher = ReturnType<typeof createHmacInviteTokenHasherFromEnv>;

export interface OrganizationsPluginDeps {
	auth: ReturnType<typeof betterAuth>;
	agencyRepository: OrganizationsDb["agencyRepository"];
	membershipRepository: OrganizationsDb["membershipRepository"];
	commandJournal: OrganizationsDb["commandJournal"];
	unitOfWork: OrganizationUnitOfWork;
	principalLookup: PrincipalLookup;
	inviteTokenHasher: InviteTokenHasher;
	identityRepository: PrincipalRepository;
	scopedPool: TenantScopedQueryable;
}

function requestIdFrom(headers: Headers): string | undefined {
	return headers.get("x-request-id") ?? undefined;
}

async function resolveSessionPrincipal(
	deps: OrganizationsPluginDeps,
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

export function createOrganizationsPlugin(deps: OrganizationsPluginDeps) {
	return new Elysia({ name: "organizations", prefix: "/v1/organizations" })
		.onError(({ error, set, request }) => {
			const mapped = mapOrganizationsError(
				error,
				requestIdFrom(request.headers),
			);
			set.status = mapped.status;
			return mapped.body;
		})
		.post(
			"/agencies",
			async ({ request }) => {
				const { principal } = await resolveSessionPrincipal(deps, request);
				const commandId = parseIdempotencyKey(request.headers);
				const body = await request.json();
				return handleCreateAgency(deps, {
					commandId,
					principalId: principal.id,
					body,
				});
			},
			organizationsOpenApi.createAgency,
		)
		.get(
			"/agencies",
			async ({ request }) => {
				const { principal } = await resolveSessionPrincipal(deps, request);
				return handleListAgencies(deps, principal.id);
			},
			organizationsOpenApi.listAgencies,
		)
		.group("/agencies/:agencyId", (scoped) =>
			scoped
				.resolve(async ({ request, params }) => {
					const { principal } = await resolveSessionPrincipal(deps, request);
					await requireAgencyMembership(
						deps.scopedPool,
						params.agencyId,
						principal.id,
					);
					return { principal };
				})
				.get(
					"",
					async ({ params, principal }) =>
						handleGetAgency(deps, {
							agencyId: params.agencyId,
							principalId: principal.id,
						}),
					organizationsOpenApi.getAgency,
				)
				.patch(
					"/markets",
					async ({ request, params, principal }) => {
						const commandId = parseIdempotencyKey(request.headers);
						const body = await request.json();
						return handleUpdateAgencyMarkets(deps, {
							commandId,
							agencyId: params.agencyId,
							principalId: principal.id,
							body,
						});
					},
					organizationsOpenApi.updateAgencyMarkets,
				)
				.post(
					"/ownership/transfer",
					async ({ request, params, principal }) => {
						await requireAgencyMutationRole(
							deps.scopedPool,
							params.agencyId,
							principal.id,
						);
						const commandId = parseIdempotencyKey(request.headers);
						const body = await request.json();
						return handleTransferOwnership(deps, {
							commandId,
							agencyId: params.agencyId,
							principalId: principal.id,
							body,
						});
					},
					organizationsOpenApi.transferOwnership,
				)
				.get(
					"/memberships",
					async ({ params, principal }) =>
						handleListMemberships(deps, {
							agencyId: params.agencyId,
							principalId: principal.id,
						}),
					organizationsOpenApi.listMemberships,
				)
				.get(
					"/memberships/:membershipId",
					async ({ params, principal }) =>
						handleGetMembership(deps, {
							agencyId: params.agencyId,
							membershipId: params.membershipId,
							principalId: principal.id,
						}),
					organizationsOpenApi.getMembership,
				)
				.post(
					"/memberships/invite",
					async ({ request, params, principal }) => {
						const commandId = parseIdempotencyKey(request.headers);
						const body = await request.json();
						return handleInviteMember(deps, {
							commandId,
							agencyId: params.agencyId,
							principalId: principal.id,
							body,
						});
					},
					organizationsOpenApi.inviteMember,
				)
				.post(
					"/memberships/:membershipId/activate",
					async ({ request, params, principal }) => {
						const commandId = parseIdempotencyKey(request.headers);
						return handleActivateMembership(deps, {
							commandId,
							agencyId: params.agencyId,
							membershipId: params.membershipId,
							principalId: principal.id,
						});
					},
					organizationsOpenApi.activateMembership,
				)
				.post(
					"/memberships/:membershipId/revoke",
					async ({ request, params, principal }) => {
						const commandId = parseIdempotencyKey(request.headers);
						return handleRevokeMembership(deps, {
							commandId,
							agencyId: params.agencyId,
							membershipId: params.membershipId,
							principalId: principal.id,
						});
					},
					organizationsOpenApi.revokeMembership,
				),
		)
		.post(
			"/invites/accept",
			async ({ request, server }) => {
				await assertInviteAcceptRateLimit(
					resolveClientIp(request, server?.requestIP),
				);
				const { principal, session } = await resolveSessionPrincipal(
					deps,
					request,
				);
				const commandId = parseIdempotencyKey(request.headers);
				const body = await request.json();
				return handleAcceptInvite(deps, {
					commandId,
					principalId: principal.id,
					sessionEmail: session.user.email,
					body,
				});
			},
			organizationsOpenApi.acceptInvite,
		);
}
