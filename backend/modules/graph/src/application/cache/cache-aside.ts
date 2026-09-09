import { shouldCacheTraversalResult } from "../../domain/cache/should-cache-traversal";

/**
 * Cache-aside helper for graph traversals. Uses runtime-injected key/TTL resolvers
 * so application does not import infrastructure adapters.
 */
export async function getOrLoadGraphCacheValue(runtime, input, load) {
	if (!shouldCacheTraversalResult(input)) {
		return { value: await load(), cacheHit: false };
	}
	const key = runtime.buildCacheKey(input);
	const hit = await runtime.cache.get(key);
	if (hit) {
		return { value: hit.value, cacheHit: true };
	}
	const value = await load();
	const ttlSeconds = runtime.resolveCacheTtlSeconds(input);
	await runtime.cache.set(key, value, ttlSeconds);
	return { value, cacheHit: false };
}
