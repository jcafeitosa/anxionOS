import { type GraphCacheInvalidate } from "@anxionos/contracts/graph";
import { GRAPH_CACHE_TTL_SECONDS, graphCacheInvalidateSchema, } from "@anxionos/contracts/graph";

export const GRAPH_CACHE_INVALIDATE_CHANNEL = "graph:invalidate";
export function createRedisL2Cache(options: RedisL2CacheOptions): RedisL2Cache {
    let writeEnabled = options.writeEnabled ?? true;
    return {
        async get(key) {
            return options.redis.get(key);
        },
        async set(key, value, ttlSeconds) {
            if (!writeEnabled) {
                return;
            }
            await options.redis.set(key, value, ttlSeconds);
        },
        async deleteKeys(keys) {
            if (keys.length === 0) {
                return 0;
            }
            return options.redis.del(keys);
        },
        async deleteByPrefix(prefix, batchSize = 500) {
            const keys = await options.redis.scanKeys(`${prefix}*`, batchSize);
            if (keys.length === 0) {
                return 0;
            }
            return options.redis.del(keys);
        },
        async publishInvalidate(message) {
            const parsed = graphCacheInvalidateSchema.parse(message);
            await options.redis.publish(GRAPH_CACHE_INVALIDATE_CHANNEL, JSON.stringify(parsed));
        },
        isWriteEnabled() {
            return writeEnabled;
        },
        setWriteEnabled(enabled) {
            writeEnabled = enabled;
        },
    };
}
export function parseGraphCacheInvalidateMessage(raw: string): GraphCacheInvalidate | null {
    try {
        return graphCacheInvalidateSchema.parse(JSON.parse(raw));
    }
    catch {
        return null;
    }
}
/** Subscribes to `graph:invalidate` and invokes handler for valid messages. */
export async function subscribeGraphCacheInvalidation(options) {
    const shouldAccept = options.shouldAccept ??
        ((message) => message.authorityEpoch >= 0 && message.riskEpoch >= 0);
    return options.redis.subscribe(GRAPH_CACHE_INVALIDATE_CHANNEL, async (raw) => {
        const message = parseGraphCacheInvalidateMessage(raw);
        if (!message || !shouldAccept(message)) {
            return;
        }
        await options.onInvalidate(message);
    });
}
export function resolveL2TtlSeconds(traversalId: "T01" | "T03" | "T15", decision?: "ALLOW" | "DENY" | "REQUIRE_APPROVAL"): number {
    if (traversalId === "T15") {
        return GRAPH_CACHE_TTL_SECONDS.T15;
    }
    if (decision === "DENY" || decision === "REQUIRE_APPROVAL") {
        return GRAPH_CACHE_TTL_SECONDS.T03_DENY;
    }
    return GRAPH_CACHE_TTL_SECONDS.T03_DENY;
}

export interface GraphCacheRedisCommandPort {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds: number): Promise<void>;
    del(keys: readonly string[]): Promise<number>;
    scanKeys(pattern: string, limit: number): Promise<string[]>;
    publish(channel: string, message: string): Promise<void>;
    subscribe(channel: string, handler: (message: string) => void | Promise<void>): Promise<() => Promise<void>>;
}

export interface RedisL2CacheOptions {
    redis: GraphCacheRedisCommandPort;
    writeEnabled?: boolean;
}

export interface RedisL2Cache {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds: number): Promise<void>;
    deleteKeys(keys: readonly string[]): Promise<number>;
    deleteByPrefix(prefix: string, batchSize?: number): Promise<number>;
    publishInvalidate(message: GraphCacheInvalidate): Promise<void>;
    isWriteEnabled(): boolean;
    setWriteEnabled(enabled: boolean): void;
}

export interface GraphCacheInvalidateSubscriberOptions {
    redis: GraphCacheRedisCommandPort;
    onInvalidate: (message: GraphCacheInvalidate) => void | Promise<void>;
    shouldAccept?: (message: GraphCacheInvalidate) => boolean;
}
