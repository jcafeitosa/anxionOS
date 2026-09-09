import type { Pool, PoolClient, PoolConfig } from "pg";
import { Pool as PgPool } from "pg";
import { TenantContextError } from "./errors";
import { ANXION_APP_ROLE, ANXION_SERVICE_ROLE } from "./roles";
import {
	AGENCY_ID_SETTING,
	BYPASS_RLS_SETTING,
	TENANT_ID_SETTING,
	type DatabaseRole,
	type TenantContext,
	validateTenantContext,
} from "./tenant-context";

export interface ScopedPoolConfig extends PoolConfig {
	readonly role?: DatabaseRole;
}

export interface TenantScopedQueryable {
	readonly pool: Pool;
	withContext<T>(
		ctx: TenantContext,
		fn: (client: PoolClient) => Promise<T>,
	): Promise<T>;
	withPlatformContext<T>(fn: (client: PoolClient) => Promise<T>): Promise<T>;
	end(): Promise<void>;
}

async function setLocalConfig(
	client: PoolClient,
	setting: string,
	value: string,
): Promise<void> {
	await client.query("SELECT set_config($1, $2, true)", [setting, value]);
}

async function enforceRowSecurity(client: PoolClient): Promise<void> {
	await setLocalConfig(client, "row_security", "on");
}

async function assumeApplicationRole(client: PoolClient): Promise<void> {
	await client.query(`SET LOCAL ROLE ${ANXION_APP_ROLE}`);
}

async function assumeServiceRole(client: PoolClient): Promise<void> {
	await client.query(`SET LOCAL ROLE ${ANXION_SERVICE_ROLE}`);
}

export async function applyTenantContext(
	client: PoolClient,
	ctx: TenantContext,
	options: { role?: DatabaseRole } = {},
): Promise<void> {
	validateTenantContext(ctx);
	await enforceRowSecurity(client);

	if (ctx.bypassRls) {
		if (options.role !== "service") {
			throw new TenantContextError(
				"bypassRls is only permitted on service-role connections",
			);
		}
		await assumeServiceRole(client);
		await setLocalConfig(client, BYPASS_RLS_SETTING, "true");
	} else {
		await assumeApplicationRole(client);
		await setLocalConfig(client, BYPASS_RLS_SETTING, "false");
	}

	await setLocalConfig(client, TENANT_ID_SETTING, ctx.tenantId);

	if (ctx.agencyId) {
		await setLocalConfig(client, AGENCY_ID_SETTING, ctx.agencyId);
	} else {
		await setLocalConfig(client, AGENCY_ID_SETTING, "");
	}
}

export function createScopedPool(config: ScopedPoolConfig): TenantScopedQueryable {
	const { role, ...poolConfig } = config;
	const pool = new PgPool(poolConfig);

	return {
		pool,
		async withContext<T>(
			ctx: TenantContext,
			fn: (client: PoolClient) => Promise<T>,
		): Promise<T> {
			const client = await pool.connect();
			try {
				await client.query("BEGIN");
				await applyTenantContext(client, ctx, { role });
				const result = await fn(client);
				await client.query("COMMIT");
				return result;
			} catch (error) {
				await client.query("ROLLBACK");
				throw error;
			} finally {
				client.release();
			}
		},
		async withPlatformContext<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
			const client = await pool.connect();
			try {
				await client.query("BEGIN");
				await enforceRowSecurity(client);
				await assumeApplicationRole(client);
				await setLocalConfig(client, BYPASS_RLS_SETTING, "false");
				await setLocalConfig(client, TENANT_ID_SETTING, "");
				await setLocalConfig(client, AGENCY_ID_SETTING, "");
				const result = await fn(client);
				await client.query("COMMIT");
				return result;
			} catch (error) {
				await client.query("ROLLBACK");
				throw error;
			} finally {
				client.release();
			}
		},
		async end() {
			await pool.end();
		},
	};
}
