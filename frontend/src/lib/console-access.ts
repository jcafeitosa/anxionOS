export type ConsoleKind = "owner" | "operator" | "platform" | "partner";

type ConsoleRole = "owner" | "admin" | "operator" | "viewer";

export type ConsoleAccessDecisionKind =
	| "platform"
	| "owner"
	| "operator"
	| "partner"
	| "select_organization"
	| "onboarding"
	| "denied";

export interface ConsoleAccessContext {
	authenticated: boolean;
	platformAccess: boolean;
	partnerAccess: boolean;
	membershipsActive: ReadonlyArray<{
		agencyId: string;
		role: ConsoleRole;
	}>;
	decision: {
		kind: ConsoleAccessDecisionKind;
		reason?: string;
	};
}

/**
 * Fail-closed console gate. `denied` and `onboarding` (MFA_REQUIRED,
 * EMAIL_UNVERIFIED, INVITE_PENDING, …) reject before membership lookup so a
 * leftover owner/admin row cannot open the shell. `select_organization` still
 * allows the matching membership — do not require decision.kind === "owner".
 */
export function canAccessConsole(
	context: ConsoleAccessContext,
	kind: ConsoleKind,
	agencyId?: string,
): boolean {
	if (!context.authenticated) {
		return false;
	}
	if (kind === "platform") {
		return context.platformAccess === true && context.decision.kind === "platform";
	}
	if (kind === "partner") {
		return context.partnerAccess === true && context.decision.kind === "partner";
	}
	if (context.decision.kind === "denied" || context.decision.kind === "onboarding") {
		return false;
	}
	if (!agencyId) {
		return false;
	}
	const membership = context.membershipsActive.find(
		(item) => item.agencyId === agencyId,
	);
	if (!membership) {
		return false;
	}
	if (kind === "owner") {
		return membership.role === "owner" || membership.role === "admin";
	}
	return membership.role === "operator" || membership.role === "viewer";
}
