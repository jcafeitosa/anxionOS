const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
export class GraphTraversalRateLimiter {
	buckets = new Map();
	check(key) {
		const now = Date.now();
		const bucket = this.buckets.get(key);
		if (!bucket || now - bucket.windowStartMs >= WINDOW_MS) {
			this.buckets.set(key, { count: 1, windowStartMs: now });
			return true;
		}
		if (bucket.count >= MAX_REQUESTS) {
			return false;
		}
		bucket.count += 1;
		return true;
	}
	reset() {
		this.buckets.clear();
	}
}
export function buildTraversalRateLimitKey(
	principalId: string,
	traversalId: string,
): string {
	return `${principalId}:${traversalId}`;
}
