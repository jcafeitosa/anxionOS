import type { PrincipalStatus } from "../entities/principal";

/**
 * R03 lifecycle: ACTIVE | SUSPENDED | REVOKED.
 * REVOKED is terminal — `revoked → *` is never allowed, including reactivation,
 * so a compromised principal cannot be silently restored.
 */
const ALLOWED_TRANSITIONS: Record<PrincipalStatus, PrincipalStatus[]> = {
	active: ["suspended", "revoked"],
	suspended: ["active", "revoked"],
	revoked: [],
};

export function canTransition(
	from: PrincipalStatus,
	to: PrincipalStatus,
): boolean {
	return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * Optimistic concurrency guard (R03 `revision`). `expected === undefined`
 * disables the check; otherwise the caller's view must match the stored state.
 */
export function revisionMatches(actual: number, expected?: number): boolean {
	return expected === undefined || actual === expected;
}
