import { AppError } from "@anxionos/contracts/errors";
import { createLogger } from "@anxionos/observability";
import type { Pool } from "pg";

const logger = createLogger({ service: "api" });

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

function serializeRollbackError(error: unknown): {
	name: string;
	message: string;
} {
	if (error instanceof Error) {
		return { name: error.name, message: error.message };
	}
	return { name: typeof error, message: String(error) };
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
				// ANX-489 F4 — janela nova nao colapsa concorrentes: o `ON
				// CONFLICT` comparava `window_start_ms` por ms exato; duas
				// transacoes que leem "sem linha" e inserem com `now` distintos
				// (ex.: 1000 vs 1005) zeravam o contador uma da outra
				// (count = 1 com N aceitos). Agora o bucket e' a JANELA
				// (`div(window_start_ms, window)`): na mesma janela incrementa;
				// janela diferente comeca de 1. E o contrato "10 por janela"
				// vale TAMBEM no instante de abertura: a chamada que estourar o
				// limite no proprio upsert recebe 429.
				const upserted = await client.query<{ count: number }>(
					`INSERT INTO api_invite_accept_rate_limits (client_ip, count, window_start_ms)
           VALUES ($1, 1, $2)
           ON CONFLICT (client_ip)
           DO UPDATE SET
             count = CASE
               WHEN div(api_invite_accept_rate_limits.window_start_ms, $3) =
                    div(EXCLUDED.window_start_ms, $3)
               THEN api_invite_accept_rate_limits.count + 1
               ELSE 1
             END,
             window_start_ms = GREATEST(
               api_invite_accept_rate_limits.window_start_ms,
               EXCLUDED.window_start_ms
             )
           RETURNING count`,
					[clientIp, now, INVITE_ACCEPT_WINDOW_MS],
				);
				if (Number(upserted.rows[0]?.count) > INVITE_ACCEPT_LIMIT) {
					await client.query("ROLLBACK");
					rateLimitExceeded();
				}
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
			// ANX-489 F5 — rollback best-effort: nunca substitui o erro original.
			try {
				await client.query("ROLLBACK");
			} catch (rollbackError) {
				logger.error("invite accept rate limit rollback failed", {
					cause: serializeRollbackError(rollbackError),
				});
			}
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
