export interface RetryPolicy {
	maxAttempts: number;
	baseDelayMs: number;
	maxDelayMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
	maxAttempts: 5,
	baseDelayMs: 250,
	maxDelayMs: 30_000,
};

export function computeBackoffDelay(
	attempt: number,
	policy: RetryPolicy = DEFAULT_RETRY_POLICY,
): number {
	const exponential = policy.baseDelayMs * 2 ** Math.max(0, attempt - 1);
	return Math.min(exponential, policy.maxDelayMs);
}

export function shouldRetry(
	attempt: number,
	policy: RetryPolicy = DEFAULT_RETRY_POLICY,
): boolean {
	return attempt < policy.maxAttempts;
}
