import type { Pool, PoolConfig } from "pg";
import { Pool as PgPool } from "pg";

export { DatabaseMigrationError, TenantContextError } from "./errors";
export {
	provisionDatabaseRoles,
	type RunDatabaseMigrationsOptions,
	rollbackDatabaseMigrations,
	runDatabaseMigrations,
} from "./migrate";
export {
	disableRls,
	dropPolicy,
	enableRls,
	forceRls,
	tenantDeletePolicy,
	tenantInsertPolicy,
	tenantScopedPolicies,
	tenantSelectPolicy,
	tenantUpdatePolicy,
} from "./rls-policy-helpers";
export {
	ANXION_APP_ROLE,
	ANXION_MIGRATOR_ROLE,
	ANXION_SERVICE_ROLE,
	createRolesSql,
	dropRolesSql,
	type RoleMigrationOptions,
} from "./roles";
export {
	applyTenantContext,
	createScopedPool,
	type ScopedPoolConfig,
	type TenantScopedQueryable,
} from "./scoped-pool";
export type { DatabaseRole, TenantContext } from "./tenant-context";
export {
	AGENCY_ID_SETTING,
	assertUuid,
	BYPASS_RLS_SETTING,
	requireTenantContext,
	TENANT_ID_SETTING,
	UUID_PATTERN,
	validateTenantContext,
} from "./tenant-context";

export interface DatabaseConfig {
	url: string;
	maxConnections?: number;
	ssl?: boolean | { rejectUnauthorized?: boolean };
}

export interface DatabaseConnection {
	readonly url: string;
	readonly pool: Pool;
	ping(): Promise<boolean>;
	close(): Promise<void>;
}

export function createPool(config: DatabaseConfig): Pool {
	if (!config.url) {
		throw new Error("DATABASE_URL is required");
	}

	const poolConfig: PoolConfig = {
		connectionString: config.url,
		max: config.maxConnections ?? 10,
	};

	if (config.ssl !== undefined) {
		poolConfig.ssl = config.ssl;
	}

	return new PgPool(poolConfig);
}

export async function createConnection(
	config: DatabaseConfig,
): Promise<DatabaseConnection> {
	const pool = createPool(config);

	return {
		url: config.url,
		pool,
		async ping() {
			const client = await pool.connect();
			try {
				await client.query("SELECT 1");
				return true;
			} catch {
				return false;
			} finally {
				client.release();
			}
		},
		async close() {
			await pool.end();
		},
	};
}
