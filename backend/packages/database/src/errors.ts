export class TenantContextError extends Error {
	readonly code = "TENANT_CONTEXT_ERROR";

	constructor(message: string) {
		super(message);
		this.name = "TenantContextError";
	}
}

export class DatabaseMigrationError extends Error {
	readonly code = "DATABASE_MIGRATION_ERROR";

	constructor(message: string) {
		super(message);
		this.name = "DatabaseMigrationError";
	}
}
