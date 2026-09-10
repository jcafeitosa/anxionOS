import { ANXION_SERVICE_ROLE } from "./roles";
import {
	AGENCY_ID_SETTING,
	BYPASS_RLS_SETTING,
	TENANT_ID_SETTING,
} from "./tenant-context";

function quoteIdent(value: string): string {
	return `"${value.replace(/"/g, '""')}"`;
}

export function enableRls(table: string): string {
	return `ALTER TABLE ${quoteIdent(table)} ENABLE ROW LEVEL SECURITY;`;
}

export function forceRls(table: string): string {
	return `ALTER TABLE ${quoteIdent(table)} FORCE ROW LEVEL SECURITY;`;
}

function tenantMatchExpression(tenantColumn: string): string {
	return `${quoteIdent(tenantColumn)}::text = current_setting('${TENANT_ID_SETTING}', true)`;
}

function agencyMatchExpression(agencyColumn: string): string {
	return `${quoteIdent(agencyColumn)}::text = current_setting('${AGENCY_ID_SETTING}', true)`;
}

function serviceBypassExpression(): string {
	return `(current_setting('${BYPASS_RLS_SETTING}', true) = 'true' AND pg_has_role(current_user, '${ANXION_SERVICE_ROLE}', 'member'))`;
}

function usingClause(
	tenantColumn: string,
	agencyColumn?: string,
	includeServiceBypass = true,
): string {
	const tenantParts = [tenantMatchExpression(tenantColumn)];
	if (agencyColumn) {
		tenantParts.push(agencyMatchExpression(agencyColumn));
	}
	const tenantScope = tenantParts.join(" AND ");
	if (!includeServiceBypass) {
		return tenantScope;
	}
	return `(${tenantScope}) OR ${serviceBypassExpression()}`;
}

export function tenantSelectPolicy(
	table: string,
	tenantColumn = "tenant_id",
	policyName?: string,
): string {
	const name = policyName ?? `${table}_tenant_select`;
	return `
CREATE POLICY ${quoteIdent(name)} ON ${quoteIdent(table)}
  FOR SELECT
  USING (${usingClause(tenantColumn)});
`.trim();
}

export function tenantInsertPolicy(
	table: string,
	tenantColumn = "tenant_id",
	policyName?: string,
): string {
	const name = policyName ?? `${table}_tenant_insert`;
	return `
CREATE POLICY ${quoteIdent(name)} ON ${quoteIdent(table)}
  FOR INSERT
  WITH CHECK (${usingClause(tenantColumn)});
`.trim();
}

export function tenantUpdatePolicy(
	table: string,
	tenantColumn = "tenant_id",
	policyName?: string,
): string {
	const name = policyName ?? `${table}_tenant_update`;
	return `
CREATE POLICY ${quoteIdent(name)} ON ${quoteIdent(table)}
  FOR UPDATE
  USING (${usingClause(tenantColumn)})
  WITH CHECK (${usingClause(tenantColumn)});
`.trim();
}

export function tenantDeletePolicy(
	table: string,
	tenantColumn = "tenant_id",
	policyName?: string,
): string {
	const name = policyName ?? `${table}_tenant_delete`;
	return `
CREATE POLICY ${quoteIdent(name)} ON ${quoteIdent(table)}
  FOR DELETE
  USING (${usingClause(tenantColumn)});
`.trim();
}

export function dropPolicy(table: string, policyName: string): string {
	return `DROP POLICY IF EXISTS ${quoteIdent(policyName)} ON ${quoteIdent(table)};`;
}

export function disableRls(table: string): string {
	return `ALTER TABLE ${quoteIdent(table)} DISABLE ROW LEVEL SECURITY;`;
}

export function tenantScopedPolicies(
	table: string,
	tenantColumn = "tenant_id",
): string {
	return [
		enableRls(table),
		forceRls(table),
		tenantSelectPolicy(table, tenantColumn),
		tenantInsertPolicy(table, tenantColumn),
		tenantUpdatePolicy(table, tenantColumn),
		tenantDeletePolicy(table, tenantColumn),
	].join("\n\n");
}
