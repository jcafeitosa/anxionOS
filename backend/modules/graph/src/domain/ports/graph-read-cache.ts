import type {

CacheableTraversalId,
	GraphCacheInvalidate,
} from "@anxionos/contracts/graph";

export interface GraphCacheEntry<T = unknown> {
	value: T;
	cachedAtMs: number;
	ttlSeconds: number;
}

export interface GraphReadCache {
	get<T>(key: string): Promise<GraphCacheEntry<T> | null>;
	set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
	delete(key: string): void;
	clear(): void;
	flushByScopeHash(scopeHash: string): Promise<void>;
	handleInvalidation(message: GraphCacheInvalidate): Promise<void>;
	flushRegistryCache(registryGeneration: number): Promise<void>;
	publishInvalidate(message: GraphCacheInvalidate): Promise<void>;
	setWriteEnabled(enabled: boolean): void;
	isWriteEnabled(): boolean;
}

export interface GraphCacheLookupInput {
	traversalId: CacheableTraversalId;
	scopeType: string;
	scopeId: string;
	principalId: string;
	queryParams: unknown;
	authorityEpoch: number;
	riskEpoch: number;
	catalogGeneration: number;
	intentHash?: string;
	decision?: "ALLOW" | "DENY" | "REQUIRE_APPROVAL";
}
