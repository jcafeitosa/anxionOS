import type { Pool, PoolClient } from "pg";
import { DatabaseMigrationError } from "./errors";
import { RLS_FIXTURE_DOWN_SQL, RLS_FIXTURE_UP_SQL } from "./migrations/rls-fixture-ddl";
import { ANXION_APP_ROLE, ANXION_SERVICE_ROLE, createRolesSql } from "./roles";

const FIXTURE_TABLE = "anxionos_tenant_records";

export interface RunDatabaseMigrationsOptions {
	readonly includeRoles?: boolean;
	readonly rolePassword?: string;
	readonly databaseName?: string;
}

async function grantFixtureTableAccess(client: PoolClient): Promise<void> {
	await client.query(
		`GRANT SELECT, INSERT, UPDATE, DELETE ON ${FIXTURE_TABLE} TO ${ANXION_APP_ROLE}, ${ANXION_SERVICE_ROLE}`,
	);
}

export async function runDatabaseMigrations(
	pool: Pool,
	options: RunDatabaseMigrationsOptions = {},
): Promise<void> {
	const client = await pool.connect();
	try {
		if (options.includeRoles) {
			await client.query(
				createRolesSql({
					password: options.rolePassword,
					databaseName: options.databaseName,
				}),
			);
		}

		await client.query(RLS_FIXTURE_UP_SQL);

		if (options.includeRoles) {
			await grantFixtureTableAccess(client);
		}
	} catch (error) {
		throw new DatabaseMigrationError(
			error instanceof Error ? error.message : "database migration failed",
		);
	} finally {
		client.release();
	}
}

export async function rollbackDatabaseMigrations(pool: Pool): Promise<void> {
	const client = await pool.connect();
	try {
		await client.query(RLS_FIXTURE_DOWN_SQL);
	} catch (error) {
		throw new DatabaseMigrationError(
			error instanceof Error ? error.message : "database rollback failed",
		);
	} finally {
		client.release();
	}
}
