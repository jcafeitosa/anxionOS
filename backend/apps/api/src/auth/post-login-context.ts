export const POST_LOGIN_POLICY_VERSION = "post-login.v1";
export const POST_LOGIN_CONTEXT_TTL_MS = 60_000;

export const CONSOLE_ROLES = ["owner", "admin", "operator", "viewer"] as const;

export type ConsoleRole = (typeof CONSOLE_ROLES)[number];

export type PostLoginDecisionKind =
	| "platform"
	| "owner"
	| "operator"
	| "partner"
	| "select_organization"
	| "onboarding"
	| "denied";

export interface PostLoginMembershipActive {
	agencyId: string;
	role: ConsoleRole;
	status: "active";
}

export interface PostLoginMembershipPending {
	agencyId?: string;
	role?: ConsoleRole;
	inviteEmail?: string;
	inviteExpiresAt?: string;
}

export interface PostLoginAuthContext {
	authenticated: boolean;
	emailVerified: boolean;
	mfaRequired: boolean;
	principal: {
		id: string;
		authUserId: string;
		email: string;
		displayName?: string | null;
	} | null;
	membershipsActive: PostLoginMembershipActive[];
	membershipsPending: PostLoginMembershipPending[];
	platformAccess: boolean;
	partnerAccess: boolean;
	onboardingState: {
		needsProfile: boolean;
		needsOrganization: boolean;
		needsEmailVerification?: boolean;
		needsMfa?: boolean;
		state?: string;
	};
	decision: {
		kind: PostLoginDecisionKind;
		agencyId?: string;
		role?: ConsoleRole;
		reason: string;
	};
	authorization?: {
		policyVersion: string;
		authorityEpoch?: number;
		generatedAt: string;
		expiresAt?: string;
	};
	emailDelivery?: {
		verificationConfigured: boolean;
	};
}

export interface PostLoginDecisionInput {
	authenticated: boolean;
	emailVerified: boolean;
	mfaRequired: boolean;
	principal: {
		id: string;
		authUserId: string;
		email: string;
		displayName?: string | null;
		status: "active" | "suspended";
	} | null;
	membershipsActive: Array<{ agencyId: string; role: string }>;
	membershipsPending: PostLoginMembershipPending[];
	platformAccess: boolean;
	partnerAccess: boolean;
	now: Date;
}

function isConsoleRole(role: string): role is ConsoleRole {
	return (CONSOLE_ROLES as readonly string[]).includes(role);
}

function isInviteActionable(
	invite: PostLoginMembershipPending,
	now: Date,
): boolean {
	if (!invite.inviteExpiresAt) {
		return true;
	}
	const expires = Date.parse(invite.inviteExpiresAt);
	if (Number.isNaN(expires)) {
		return false;
	}
	return expires > now.getTime();
}

function kindForRole(role: ConsoleRole): "owner" | "operator" {
	if (role === "owner" || role === "admin") {
		return "owner";
	}
	return "operator";
}

function withAuthorization(
	context: Omit<PostLoginAuthContext, "authorization">,
	now: Date,
): PostLoginAuthContext {
	return {
		...context,
		authorization: {
			policyVersion: POST_LOGIN_POLICY_VERSION,
			generatedAt: now.toISOString(),
			expiresAt: new Date(now.getTime() + POST_LOGIN_CONTEXT_TTL_MS).toISOString(),
		},
	};
}

function principalPublic(
	principal: NonNullable<PostLoginDecisionInput["principal"]>,
): NonNullable<PostLoginAuthContext["principal"]> {
	return {
		id: principal.id,
		authUserId: principal.authUserId,
		email: principal.email,
		displayName: principal.displayName ?? null,
	};
}

/**
 * Precedence (ANX-297): session → MFA → email → pending invites (no active
 * membership) → PLATFORM grant → partner → memberships (1 console, N select-org,
 * 0 onboarding/denied). platformAccess/partnerAccess are never inferred.
 */
export function decidePostLoginContext(
	input: PostLoginDecisionInput,
): PostLoginAuthContext {
	const now = input.now;
	if (!input.authenticated) {
		return withAuthorization(
			{
				authenticated: false,
				emailVerified: false,
				mfaRequired: false,
				principal: null,
				membershipsActive: [],
				membershipsPending: [],
				platformAccess: false,
				partnerAccess: false,
				onboardingState: {
					needsProfile: false,
					needsOrganization: false,
				},
				decision: {
					kind: "denied",
					reason: "SESSION_MISSING",
				},
			},
			now,
		);
	}

	const activeMemberships: PostLoginMembershipActive[] =
		input.membershipsActive.flatMap((membership) => {
			if (!isConsoleRole(membership.role)) {
				return [];
			}
			return [
				{
					agencyId: membership.agencyId,
					role: membership.role,
					status: "active" as const,
				},
			];
		});
	const pendingMemberships = input.membershipsPending.filter((invite) =>
		isInviteActionable(invite, now),
	);

	const base = {
		authenticated: true as const,
		emailVerified: input.emailVerified,
		mfaRequired: input.mfaRequired,
		principal: input.principal ? principalPublic(input.principal) : null,
		membershipsActive: activeMemberships,
		membershipsPending: pendingMemberships,
		platformAccess: input.platformAccess === true,
		partnerAccess: input.partnerAccess === true,
	};

	if (!input.principal) {
		return withAuthorization(
			{
				...base,
				onboardingState: {
					needsProfile: true,
					needsOrganization: false,
					state: "principal_missing",
				},
				decision: { kind: "denied", reason: "PRINCIPAL_MISSING" },
			},
			now,
		);
	}

	if (input.principal.status === "suspended") {
		return withAuthorization(
			{
				...base,
				onboardingState: {
					needsProfile: false,
					needsOrganization: false,
					state: "suspended",
				},
				decision: { kind: "denied", reason: "PRINCIPAL_SUSPENDED" },
			},
			now,
		);
	}

	if (input.mfaRequired) {
		return withAuthorization(
			{
				...base,
				onboardingState: {
					needsProfile: false,
					needsOrganization: false,
					needsMfa: true,
					state: "mfa_required",
				},
				decision: { kind: "onboarding", reason: "MFA_REQUIRED" },
			},
			now,
		);
	}

	if (!input.emailVerified) {
		return withAuthorization(
			{
				...base,
				onboardingState: {
					needsProfile: false,
					needsOrganization: false,
					needsEmailVerification: true,
					state: "email_unverified",
				},
				decision: { kind: "onboarding", reason: "EMAIL_UNVERIFIED" },
			},
			now,
		);
	}

	if (pendingMemberships.length > 0 && activeMemberships.length === 0) {
		return withAuthorization(
			{
				...base,
				onboardingState: {
					needsProfile: false,
					needsOrganization: true,
					state: "invite_pending",
				},
				decision: { kind: "onboarding", reason: "INVITE_PENDING" },
			},
			now,
		);
	}

	if (base.platformAccess) {
		return withAuthorization(
			{
				...base,
				onboardingState: { needsProfile: false, needsOrganization: false },
				decision: { kind: "platform", reason: "PLATFORM_GRANT" },
			},
			now,
		);
	}

	if (base.partnerAccess) {
		return withAuthorization(
			{
				...base,
				onboardingState: { needsProfile: false, needsOrganization: false },
				decision: { kind: "partner", reason: "PARTNER_ACCESS" },
			},
			now,
		);
	}

	if (activeMemberships.length === 1) {
		const membership = activeMemberships[0];
		if (!membership) {
			return withAuthorization(
				{
					...base,
					onboardingState: {
						needsProfile: false,
						needsOrganization: true,
						state: "needs_organization",
					},
					decision: { kind: "onboarding", reason: "NEEDS_ORGANIZATION" },
				},
				now,
			);
		}
		const kind = kindForRole(membership.role);
		const reasonByRole: Record<ConsoleRole, string> = {
			owner: "MEMBERSHIP_OWNER",
			admin: "MEMBERSHIP_ADMIN",
			operator: "MEMBERSHIP_OPERATOR",
			viewer: "MEMBERSHIP_VIEWER",
		};
		return withAuthorization(
			{
				...base,
				onboardingState: { needsProfile: false, needsOrganization: false },
				decision: {
					kind,
					agencyId: membership.agencyId,
					role: membership.role,
					reason: reasonByRole[membership.role],
				},
			},
			now,
		);
	}

	if (activeMemberships.length > 1) {
		return withAuthorization(
			{
				...base,
				onboardingState: { needsProfile: false, needsOrganization: false },
				decision: { kind: "select_organization", reason: "SELECT_ORGANIZATION" },
			},
			now,
		);
	}

	return withAuthorization(
		{
			...base,
			onboardingState: {
				needsProfile: false,
				needsOrganization: true,
				state: "needs_organization",
			},
			decision: { kind: "onboarding", reason: "NEEDS_ORGANIZATION" },
		},
		now,
	);
}
