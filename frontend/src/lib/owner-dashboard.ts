import type { PostLoginAuthContext } from "./auth";

export type AuthorizationFreshness = "fresh" | "stale" | "unknown";

export function authorizationFreshness(
	authorization: { expiresAt?: string } | undefined,
	nowMs: number,
): AuthorizationFreshness {
	if (!authorization?.expiresAt) {
		return "unknown";
	}
	const expiresAt = Date.parse(authorization.expiresAt);
	if (Number.isNaN(expiresAt)) {
		return "stale";
	}
	return expiresAt > nowMs ? "fresh" : "stale";
}

export function membershipForAgency(
	context: PostLoginAuthContext,
	agencyId: string,
) {
	return (
		context.membershipsActive.find((item) => item.agencyId === agencyId) ?? null
	);
}

export function pendingMembershipsForAgency(
	context: PostLoginAuthContext,
	agencyId: string,
) {
	return context.membershipsPending.filter(
		(item) => item.agencyId === agencyId || item.agencyId === undefined,
	);
}

export interface OwnerDashboardModel {
	freshness: AuthorizationFreshness;
	membershipRole: string | null;
	pendingCount: number;
	platformAccess: boolean;
	partnerAccess: boolean;
	emailVerified: boolean;
	policyVersion: string | null;
	generatedAt: string | null;
	expiresAt: string | null;
}

/**
 * Pure projection of GET /v1/auth/post-login-context. Never invents grants,
 * valuations, or agent lists.
 */
export function ownerDashboardModel(
	context: PostLoginAuthContext,
	agencyId: string,
	nowMs: number,
): OwnerDashboardModel {
	const membership = membershipForAgency(context, agencyId);
	return {
		freshness: authorizationFreshness(context.authorization, nowMs),
		membershipRole: membership?.role ?? null,
		pendingCount: pendingMembershipsForAgency(context, agencyId).length,
		platformAccess: context.platformAccess === true,
		partnerAccess: context.partnerAccess === true,
		emailVerified: context.emailVerified === true,
		policyVersion: context.authorization?.policyVersion ?? null,
		generatedAt: context.authorization?.generatedAt ?? null,
		expiresAt: context.authorization?.expiresAt ?? null,
	};
}
