/**
 * Incident retention policy (ANX-313, ANX-158 S3).
 *
 * Pure decision function: an incident is eligible for purge only when it is
 * CLOSED and the retention window (in days, supplied explicitly by the
 * caller — this module does not invent a global retention default) has
 * elapsed since `closedAt`.
 *
 * `retentionDays` is a caller-supplied parameter, not a hardcoded business
 * constant: the actual retention period is a tenant/legal decision owned
 * outside this module (governance/legal-hold policy), not fabricated here.
 */
export function isEligibleForPurge(
	closedAt: string | null,
	nowIso: string,
	retentionDays: number,
): boolean {
	if (!closedAt) return false;
	if (retentionDays <= 0) return false;
	const closedAtMs = Date.parse(closedAt);
	const nowMs = Date.parse(nowIso);
	const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
	return nowMs - closedAtMs >= retentionMs;
}
