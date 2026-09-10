import { TenantContextError } from "./errors";

/** PostgreSQL session variable for the active tenant (SET LOCAL only). */
export const TENANT_ID_SETTING = "app.tenant_id";

/** Optional agency scope within a tenant (SET LOCAL only). */
export const AGENCY_ID_SETTING = "app.agency_id";

/** Administrative bypass flag — honored only on service-role connections. */
export const BYPASS_RLS_SETTING = "app.bypass_rls";

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface TenantContext {
	readonly tenantId: string;
	readonly agencyId?: string;
	readonly principalId?: string;
	/**
	 * When true, requests defense-in-depth bypass on a service-role connection.
	 * Ignored for application-role pools — callers must not rely on silent bypass.
	 */
	readonly bypassRls?: boolean;
}

export type DatabaseRole = "app" | "service" | "migrator";

export function assertUuid(value: string, field: string): void {
	if (!UUID_PATTERN.test(value)) {
		throw new TenantContextError(`${field} must be a UUID`);
	}
}

export function validateTenantContext(ctx: TenantContext): void {
	if (!ctx.tenantId?.trim()) {
		throw new TenantContextError("tenantId is required");
	}
	assertUuid(ctx.tenantId, "tenantId");
	if (ctx.agencyId !== undefined) {
		assertUuid(ctx.agencyId, "agencyId");
	}
	if (ctx.principalId !== undefined && !ctx.principalId.trim()) {
		throw new TenantContextError("principalId cannot be empty when provided");
	}
}

export function requireTenantContext(
	ctx: TenantContext | undefined,
): TenantContext {
	if (!ctx) {
		throw new TenantContextError(
			"tenant context is required for authoritative queries",
		);
	}
	validateTenantContext(ctx);
	return ctx;
}
