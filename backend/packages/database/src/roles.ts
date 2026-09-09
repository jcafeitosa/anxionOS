export const ANXION_APP_ROLE = "anxion_app";
export const ANXION_SERVICE_ROLE = "anxion_service";
export const ANXION_MIGRATOR_ROLE = "anxion_migrator";

const DEV_ROLE_PASSWORD_FALLBACK = "change-me-in-production";

export function isProductionEnvironment(): boolean {
	return process.env.NODE_ENV === "production";
}

/** Fail-closed: production migrations must supply an explicit role password. */
export function resolveRolePassword(password?: string): string {
	if (password) {
		return password;
	}
	if (isProductionEnvironment()) {
		throw new Error(
			"Role password is required when NODE_ENV=production. Pass rolePassword to runDatabaseMigrations.",
		);
	}
	return DEV_ROLE_PASSWORD_FALLBACK;
}

export interface RoleMigrationOptions {
	readonly password?: string;
	readonly databaseName?: string;
	readonly grantAppRoleToCurrentUser?: boolean;
}

/**
 * SQL bootstrap for PostgreSQL roles used with RLS.
 * Requires a superuser or role with CREATEROLE during migration.
 */
export function createRolesSql(options: RoleMigrationOptions = {}): string {
	const password = resolveRolePassword(options.password);
	const databaseName = options.databaseName ?? "anxionos";
	const grantToCurrentUser = options.grantAppRoleToCurrentUser ?? true;

	const grantBlock = grantToCurrentUser
		? `
DO $$ BEGIN
  EXECUTE format('GRANT %I TO %I', '${ANXION_APP_ROLE}', current_user);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  EXECUTE format('GRANT %I TO %I', '${ANXION_SERVICE_ROLE}', current_user);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;`
		: "";

	return `
DO $$ BEGIN
  CREATE ROLE ${ANXION_APP_ROLE} LOGIN PASSWORD '${password.replace(/'/g, "''")}';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE ROLE ${ANXION_SERVICE_ROLE} LOGIN PASSWORD '${password.replace(/'/g, "''")}' BYPASSRLS;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE ROLE ${ANXION_MIGRATOR_ROLE} LOGIN PASSWORD '${password.replace(/'/g, "''")}' BYPASSRLS;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT CONNECT ON DATABASE ${quoteIdentifier(databaseName)} TO ${ANXION_APP_ROLE};
GRANT CONNECT ON DATABASE ${quoteIdentifier(databaseName)} TO ${ANXION_SERVICE_ROLE};
GRANT CONNECT ON DATABASE ${quoteIdentifier(databaseName)} TO ${ANXION_MIGRATOR_ROLE};

GRANT USAGE ON SCHEMA public TO ${ANXION_APP_ROLE};
GRANT USAGE ON SCHEMA public TO ${ANXION_SERVICE_ROLE};
GRANT USAGE ON SCHEMA public TO ${ANXION_MIGRATOR_ROLE};

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${ANXION_APP_ROLE};
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${ANXION_SERVICE_ROLE};
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${ANXION_MIGRATOR_ROLE};

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${ANXION_APP_ROLE};
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${ANXION_SERVICE_ROLE};
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO ${ANXION_MIGRATOR_ROLE};
${grantBlock}
`.trim();
}

export function dropRolesSql(): string {
	return `
DROP ROLE IF EXISTS ${ANXION_APP_ROLE};
DROP ROLE IF EXISTS ${ANXION_SERVICE_ROLE};
DROP ROLE IF EXISTS ${ANXION_MIGRATOR_ROLE};
`.trim();
}

function quoteIdentifier(value: string): string {
	return `"${value.replace(/"/g, '""')}"`;
}
