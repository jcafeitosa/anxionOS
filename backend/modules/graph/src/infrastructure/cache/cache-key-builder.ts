import { createHash } from "node:crypto";
import type {
	CacheableTraversalId,
	GraphCacheKeyParts,
} from "@anxionos/contracts/graph";
import {
	buildGraphCacheRedisKey,
	graphCacheKeyPartsSchema,
} from "@anxionos/contracts/graph";

export const GRAPH_CACHE_KEY_PREFIX = "graph:cache:v1";
function stableSerialize(value) {
	if (value === null || typeof value !== "object") {
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) {
		return `[${value.map((entry) => stableSerialize(entry)).join(",")}]`;
	}
	const record = value;
	const keys = Object.keys(record).sort();
	return `{${keys
		.map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
		.join(",")}}`;
}
/** sha256(scopeType|scopeId|principalId) — GK-R05-02 */
export function buildScopeHash(
	scopeType: string,
	scopeId: string,
	principalId: string,
): string {
	return createHash("sha256")
		.update(`${scopeType}|${scopeId}|${principalId}`)
		.digest("hex");
}
/** sha256(canonical JSON params) — excludes clientQueryId by caller omission */
export function buildQueryHash(queryParams: Record<string, unknown>): string {
	return createHash("sha256")
		.update(stableSerialize(queryParams))
		.digest("hex");
}
export function buildGraphCacheKeyParts(
	input: BuildGraphCacheKeyInput,
): GraphCacheKeyParts {
	return graphCacheKeyPartsSchema.parse({
		traversalId: input.traversalId,
		scopeHash: buildScopeHash(
			input.scopeType,
			input.scopeId,
			input.principalId,
		),
		queryHash: buildQueryHash(input.queryParams),
		authorityEpoch: input.authorityEpoch,
		riskEpoch: input.riskEpoch,
		catalogGeneration: input.catalogGeneration,
		offerGeneration: input.offerGeneration,
		intentHash: input.intentHash,
	});
}
export function buildGraphCacheRedisKeyFromInput(
	input: BuildGraphCacheKeyInput,
): string {
	return buildGraphCacheRedisKey(buildGraphCacheKeyParts(input));
}

export interface BuildGraphCacheKeyInput {
	traversalId: CacheableTraversalId;
	scopeType: string;
	scopeId: string;
	principalId: string;
	queryParams: Record<string, unknown>;
	authorityEpoch: number;
	riskEpoch: number;
	catalogGeneration: number;
	offerGeneration?: number;
	intentHash?: string;
}
/** sha256(scopeType|scopeId|principalId) — GK-R05-02 */
