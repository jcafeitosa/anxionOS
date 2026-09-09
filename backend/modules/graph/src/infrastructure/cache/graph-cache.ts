import { type CacheableTraversalId, type GraphCacheInvalidate, type GraphCacheKeyParts } from "@anxionos/contracts/graph";
import type { RebuildCacheControl } from "../../application/rebuild/full-generation-swap";
import { type BuildGraphCacheKeyInput } from "./cache-key-builder";
import { type GraphCacheRedisCommandPort } from "./redis-l2-cache";
import { GRAPH_CACHE_TTL_SECONDS, shouldCacheT01Decision, } from "@anxionos/contracts/graph";
import { shouldCacheTraversalResult as shouldCacheTraversalResultPolicy } from "../../domain/cache/should-cache-traversal";
import { buildGraphCacheRedisKeyFromInput, GRAPH_CACHE_KEY_PREFIX, } from "./cache-key-builder";
import { createRedisL2Cache, resolveL2TtlSeconds, subscribeGraphCacheInvalidation, } from "./redis-l2-cache";

interface LruListNode<T> { key: string; value: GraphCacheEntry<T>; prev: LruListNode<T> | null; next: LruListNode<T> | null; }
class LruTtlCache {
    private maxEntries: number;
    private defaultTtlSeconds: number;
    private nodes = new Map<string, LruListNode<unknown>>();
    private head: LruListNode<unknown> | null = null;
    private tail: LruListNode<unknown> | null = null;
    constructor(maxEntries: number, defaultTtlSeconds: number) {
        this.maxEntries = maxEntries;
        this.defaultTtlSeconds = defaultTtlSeconds;
    }
    get(key) {
        const node = this.nodes.get(key);
        if (!node) {
            return null;
        }
        const ageMs = Date.now() - node.value.cachedAtMs;
        const ttlMs = (node.value.ttlSeconds ?? this.defaultTtlSeconds) * 1000;
        if (ageMs >= ttlMs) {
            this.delete(key);
            return null;
        }
        this.moveToHead(node);
        return node.value;
    }
    set(key, value, ttlSeconds) {
        const existing = this.nodes.get(key);
        const entry = {
            value,
            cachedAtMs: Date.now(),
            ttlSeconds,
        };
        if (existing) {
            existing.value = entry;
            this.moveToHead(existing);
            return;
        }
        const node = {
            key,
            value: entry,
            prev: null,
            next: null,
        };
        this.nodes.set(key, node);
        this.insertAtHead(node);
        while (this.nodes.size > this.maxEntries) {
            this.evictTail();
        }
    }
    delete(key) {
        const node = this.nodes.get(key);
        if (!node) {
            return;
        }
        this.removeNode(node);
        this.nodes.delete(key);
    }
    clear() {
        this.nodes.clear();
        this.head = null;
        this.tail = null;
    }
    deleteByPrefix(prefix) {
        const removed: string[] = [];
        for (const key of this.nodes.keys()) {
            if (key.includes(prefix)) {
                this.delete(key);
                removed.push(key);
            }
        }
        return removed;
    }
    moveToHead(node) {
        this.removeNode(node);
        this.insertAtHead(node);
    }
    insertAtHead(node) {
        node.prev = null;
        node.next = this.head;
        if (this.head) {
            this.head.prev = node;
        }
        this.head = node;
        if (!this.tail) {
            this.tail = node;
        }
    }
    removeNode(node) {
        if (node.prev) {
            node.prev.next = node.next;
        }
        else {
            this.head = node.next;
        }
        if (node.next) {
            node.next.prev = node.prev;
        }
        else {
            this.tail = node.prev;
        }
    }
    evictTail() {
        if (!this.tail) {
            return;
        }
        const key = this.tail.key;
        this.removeNode(this.tail);
        this.nodes.delete(key);
    }
}
export function resolveGraphCacheMode(env: NodeJS.ProcessEnv = process.env): GraphCacheMode {
    return env.GRAPH_CACHE_MODE === "l1-l2" ? "l1-l2" : "local-only";
}
export { shouldCacheTraversalResultPolicy as shouldCacheTraversalResult };
const shouldCacheTraversalResult = shouldCacheTraversalResultPolicy;
export function createGraphReadCache(options: GraphReadCacheOptions = {}): GraphReadCache {
    const mode = options.mode ?? resolveGraphCacheMode();
    const l1 = new LruTtlCache(options.l1MaxEntries ?? 500, options.l1TtlSeconds ?? GRAPH_CACHE_TTL_SECONDS.L1);
    const l2 = mode === "l1-l2" && options.redis
        ? createRedisL2Cache({ redis: options.redis })
        : null;
    return {
        async get(key) {
            const l1Hit = l1.get(key);
            if (l1Hit) {
                return l1Hit;
            }
            if (!l2) {
                return null;
            }
            const raw = await l2.get(key);
            if (!raw) {
                return null;
            }
            const parsed = JSON.parse(raw);
            l1.set(key, parsed.value, parsed.ttlSeconds);
            return parsed;
        },
        async set(key, value, ttlSeconds) {
            if (!this.isWriteEnabled()) {
                return;
            }
            const entry = {
                value,
                cachedAtMs: Date.now(),
                ttlSeconds,
            };
            l1.set(key, value, ttlSeconds);
            if (l2) {
                await l2.set(key, JSON.stringify(entry), ttlSeconds);
            }
        },
        delete(key) {
            l1.delete(key);
        },
        clear() {
            l1.clear();
        },
        async flushByScopeHash(scopeHash) {
            l1.deleteByPrefix(`:${scopeHash}:`);
        },
        async handleInvalidation(_message) {
            l1.clear();
            if (l2) {
                await l2.deleteByPrefix(`${GRAPH_CACHE_KEY_PREFIX}:`);
            }
        },
        async flushRegistryCache(registryGeneration) {
            l1.clear();
            if (l2) {
                await l2.deleteByPrefix(`${GRAPH_CACHE_KEY_PREFIX}:`);
            }
            void registryGeneration;
        },
        async publishInvalidate(message) {
            if (!l2) {
                return;
            }
            await l2.publishInvalidate(message);
        },
        setWriteEnabled(enabled) {
            l2?.setWriteEnabled(enabled);
        },
        isWriteEnabled() {
            return l2?.isWriteEnabled() ?? true;
        },
    };
}
export function createGraphCacheRebuildControl(cache: GraphReadCache): RebuildCacheControl {
    return {
        setCacheWriteEnabled(enabled) {
            cache.setWriteEnabled(enabled);
        },
        async flushRegistryCache(registryGeneration) {
            await cache.flushRegistryCache(registryGeneration);
        },
    };
}
export async function getOrLoadGraphCacheValue(cache, input, load) {
    if (!shouldCacheTraversalResult(input)) {
        return { value: await load(), cacheHit: false };
    }
    const key = buildGraphCacheRedisKeyFromInput(input);
    const hit = await cache.get(key);
    if (hit) {
        return { value: hit.value, cacheHit: true };
    }
    const value = await load();
    const ttlSeconds = resolveL2TtlSeconds(input.traversalId, input.decision);
    await cache.set(key, value, ttlSeconds);
    return { value, cacheHit: false };
}
/** GK-R05-03 / GK-R06-05: publish invalidation only after inbox ack (caller invokes post-commit). */
export function createPostAckCacheInvalidationHook(cache: GraphReadCache): (input: PostAckCacheInvalidationInput) => Promise<void> {
    return async (input) => {
        const message = {
            v: 1 as const,
            scopeType: input.scopeType,
            scopeId: input.scopeId,
            reason: input.reason,
            authorityEpoch: input.authorityEpoch,
            riskEpoch: input.riskEpoch,
            at: input.at ?? new Date().toISOString(),
        };
        await cache.handleInvalidation(message);
        await cache.publishInvalidate(message);
    };
}
export async function startGraphCacheInvalidationListener(cache, redis, options) {
    return subscribeGraphCacheInvalidation({
        redis,
        shouldAccept: options?.shouldAccept,
        onInvalidate: async (message) => {
            await cache.handleInvalidation(message);
        },
    });
}

export type GraphCacheMode = "local-only" | "l1-l2";
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
export interface GraphReadCacheOptions {
    mode?: GraphCacheMode;
    l1MaxEntries?: number;
    l1TtlSeconds?: number;
    redis?: GraphCacheRedisCommandPort;
}

export interface GraphCacheLookupInput extends BuildGraphCacheKeyInput {
    decision?: "ALLOW" | "DENY" | "REQUIRE_APPROVAL";
}

export interface PostAckCacheInvalidationInput {
    scopeType: GraphCacheInvalidate["scopeType"];
    scopeId: string;
    reason: string;
    authorityEpoch: number;
    riskEpoch: number;
    at?: string;
}
/** GK-R05-03 / GK-R06-05: publish invalidation only after inbox ack (caller invokes post-commit). */

export type { GraphCacheKeyParts };
