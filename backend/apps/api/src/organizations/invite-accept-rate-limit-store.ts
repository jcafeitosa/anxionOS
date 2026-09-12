import { AppError } from "@anxionos/contracts/errors";
import type { Pool } from "pg";

export const INVITE_ACCEPT_LIMIT = 10;
export const INVITE_ACCEPT_WINDOW_MS = 60_000;
export const INVITE_ACCEPT_RETENTION_MS = 24 * 60 * 60 * 1000;
export const INVITE_ACCEPT_PURGE_INTERVAL_MS = 60 * 60 * 1000;

export interface InviteAcceptRateLimitStore {
	assertWithinLimit(clientIp: string): Promise<void> | void;
	reset(): Promise<void> | void;
}

interface RateLimitBucket {
	count: number;
	windowStartMs: number;
}

const inviteAcceptBuckets = new Map<string, RateLimitBucket>();
let inMemoryLastPurgeMs = 0;

function purgeStaleInMemoryBuckets(now: number): void {
	if (now - inMemoryLastPurgeMs < INVITE_ACCEPT_PURGE_INTERVAL_MS) {
		return;
	}
	inMemoryLastPurgeMs = now;
	const cutoff = now - INVITE_ACCEPT_RETENTION_MS;
	for (const [clientIp, bucket] of inviteAcceptBuckets) {
		if (bucket.windowStartMs < cutoff) {
			inviteAcceptBuckets.delete(clientIp);
		}
	}
}

function rateLimitExceeded(): never {
	throw new AppError({
		code: "RATE_LIMITED",
		message: "Invite accept rate limit exceeded — try again later",
		expose: true,
	});
}

export class InMemoryInviteAcceptRateLimitStore
	implements InviteAcceptRateLimitStore
{
	assertWithinLimit(clientIp: string): void {
		const now = Date.now();
		purgeStaleInMemoryBuckets(now);
		const bucket = inviteAcceptBuckets.get(clientIp);
		if (!bucket || now - bucket.windowStartMs >= INVITE_ACCEPT_WINDOW_MS) {
			inviteAcceptBuckets.set(clientIp, { count: 1, windowStartMs: now });
			return;
		}
		if (bucket.count >= INVITE_ACCEPT_LIMIT) {
			rateLimitExceeded();
		}
		bucket.count += 1;
	}

	reset(): void {
		inviteAcceptBuckets.clear();
	}
}

const ENSURE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS api_invite_accept_rate_limits (
  client_ip TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window_start_ms BIGINT NOT NULL
);
`;

export async function ensureInviteAcceptRateLimitSchema(
	pool: Pool,
): Promise<void> {
	await pool.query(ENSURE_SCHEMA_SQL);
}

export class PostgresInviteAcceptRateLimitStore
	implements InviteAcceptRateLimitStore
{
	private lastPurgeMs = 0;

	constructor(private readonly pool: Pool) {}

	private async purgeStaleRows(now: number): Promise<void> {
		if (now - this.lastPurgeMs < INVITE_ACCEPT_PURGE_INTERVAL_MS) {
			return;
		}
		this.lastPurgeMs = now;
		const cutoff = now - INVITE_ACCEPT_RETENTION_MS;
		await this.pool.query(
			"DELETE FROM api_invite_accept_rate_limits WHERE window_start_ms < $1",
			[cutoff],
		);
	}

	async assertWithinLimit(clientIp: string): Promise<void> {
		const now = Date.now();
		await this.purgeStaleRows(now);
		const client = await this.pool.connect();
		try {
			await client.query("BEGIN");
			const existing = await client.query<{
				count: number;
				window_start_ms: string;
			}>(
				`SELECT count, window_start_ms
         FROM api_invite_accept_rate_limits
         WHERE client_ip = $1
         FOR UPDATE`,
				[clientIp],
			);
			const row = existing.rows[0];
			if (
				!row ||
				now - Number(row.window_start_ms) >= INVITE_ACCEPT_WINDOW_MS
			) {
				await client.query(
					`INSERT INTO api_invite_accept_rate_limits (client_ip, count, window_start_ms)
           VALUES ($1, 1, $2)
           ON CONFLICT (client_ip)
           DO UPDATE SET count = 1, window_start_ms = EXCLUDED.window_start_ms`,
					[clientIp, now],
				);
				await client.query("COMMIT");
				return;
			}
			if (row.count >= INVITE_ACCEPT_LIMIT) {
				await client.query("ROLLBACK");
				rateLimitExceeded();
			}
			await client.query(
				`UPDATE api_invite_accept_rate_limits
         SET count = count + 1
         WHERE client_ip = $1`,
				[clientIp],
			);
			await client.query("COMMIT");
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	}

	async reset(): Promise<void> {
		await this.pool.query("TRUNCATE api_invite_accept_rate_limits");
	}
}

export type InviteAcceptRateLimitStoreKind = "memory" | "postgres";

export function resolveInviteAcceptRateLimitStoreKind(
	pool?: Pool,
): InviteAcceptRateLimitStoreKind {
	const configured = process.env.ORG_INVITE_ACCEPT_RATE_LIMIT_STORE?.trim();
	if (configured === "memory") {
		return "memory";
	}
	if (configured === "postgres") {
		return "postgres";
	}
	if (process.env.NODE_ENV === "production") {
		return "postgres";
	}
	return pool ? "postgres" : "memory";
}

export function createInviteAcceptRateLimitStore(
	pool?: Pool,
): InviteAcceptRateLimitStore {
	const kind = resolveInviteAcceptRateLimitStoreKind(pool);
	if (kind === "postgres") {
		if (!pool) {
			throw new Error(
				"ORG_INVITE_ACCEPT_RATE_LIMIT_STORE=postgres requires DATABASE_URL",
			);
		}
		return new PostgresInviteAcceptRateLimitStore(pool);
	}
	if (process.env.NODE_ENV === "production") {
		throw new Error(
			"In-memory invite accept rate limit is forbidden in production — set ORG_INVITE_ACCEPT_RATE_LIMIT_STORE=postgres with DATABASE_URL",
		);
	}
	return new InMemoryInviteAcceptRateLimitStore();
}
