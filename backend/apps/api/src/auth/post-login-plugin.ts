import type { GrantRepository } from "@anxionos/governance";
import { hasPlatformConsoleGrant } from "@anxionos/governance";
import type { PrincipalRepository } from "@anxionos/identity";
import type { MembershipRepository } from "@anxionos/organizations";
import {
	isAppError,
	resolveStatusCode,
	toErrorResponse,
} from "@anxionos/contracts/errors";
import type { betterAuth } from "better-auth";
import { Elysia } from "elysia";
import {
	type ConsoleRole,
	decidePostLoginContext,
} from "./post-login-context";
import { postLoginContextOpenApiDetail } from "../openapi-operations";

export interface PostLoginPluginDeps {
	auth: ReturnType<typeof betterAuth>;
	membershipRepository: MembershipRepository;
	identityRepository: PrincipalRepository;
	grantRepository: GrantRepository;
}

function requestIdFrom(headers: Headers): string | undefined {
	return headers.get("x-request-id") ?? undefined;
}

function isConsoleRole(role: string): role is ConsoleRole {
	return (
		role === "owner" ||
		role === "admin" ||
		role === "operator" ||
		role === "viewer"
	);
}

function sessionEmailVerified(user: {
	emailVerified?: boolean | Date | null;
}): boolean {
	if (user.emailVerified instanceof Date) {
		return true;
	}
	return user.emailVerified === true;
}

function sessionMfaRequired(input: {
	user?: unknown;
	session?: unknown;
}): boolean {
	const user = input.user as { twoFactorEnabled?: boolean } | null | undefined;
	const authSession = input.session as
		| { twoFactorVerified?: boolean }
		| null
		| undefined;
	if (user?.twoFactorEnabled !== true) {
		return false;
	}
	return authSession?.twoFactorVerified !== true;
}

export function createPostLoginPlugin(deps: PostLoginPluginDeps) {
	return new Elysia({ name: "post-login-auth-context", prefix: "/v1/auth" })
		.onError(({ error, set, request }) => {
			const requestId = requestIdFrom(request.headers);
			if (isAppError(error)) {
				set.status = resolveStatusCode(error);
				return toErrorResponse(error, { requestId });
			}
			set.status = 503;
			return toErrorResponse(error, { requestId });
		})
		.get("/post-login-context", async ({ request }) => {
			const now = new Date();
			const session = await deps.auth.api.getSession({
				headers: request.headers,
			});
			if (!session?.user?.id) {
				return decidePostLoginContext({
					authenticated: false,
					emailVerified: false,
					mfaRequired: false,
					principal: null,
					membershipsActive: [],
					membershipsPending: [],
					platformAccess: false,
					partnerAccess: false,
					now,
				});
			}

			const principal = await deps.identityRepository.findByAuthUserId(
				session.user.id,
			);
			const email = principal?.email ?? session.user.email ?? "";
			const membershipsActive = principal
				? await deps.membershipRepository.listActiveByPrincipal(principal.id)
				: [];
			const membershipsPending = principal
				? await deps.membershipRepository.listInvitedForActor({
						principalId: principal.id,
						email,
					})
				: [];
			const platformAccess = principal
				? await hasPlatformConsoleGrant(
						{ grantRepository: deps.grantRepository },
						principal.id,
						now,
					)
				: false;

			return decidePostLoginContext({
				authenticated: true,
				emailVerified: sessionEmailVerified(session.user),
				mfaRequired: sessionMfaRequired({
					user: session.user,
					session: session.session,
				}),
				principal: principal
					? {
							id: principal.id,
							authUserId: principal.authUserId,
							email: principal.email,
							displayName: session.user.name ?? null,
							status: principal.status,
						}
					: null,
				membershipsActive: membershipsActive.map((membership) => ({
					agencyId: membership.agencyId,
					role: membership.role,
				})),
				membershipsPending: membershipsPending.map((membership) => ({
					agencyId: membership.agencyId,
					role: isConsoleRole(membership.role) ? membership.role : undefined,
					inviteEmail: membership.inviteEmail ?? undefined,
					inviteExpiresAt: membership.inviteExpiresAt?.toISOString(),
				})),
				platformAccess,
				partnerAccess: false,
				now,
			});
		}, postLoginContextOpenApiDetail);
}
