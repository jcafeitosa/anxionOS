import type { ScopeContext } from "@anxionos/contracts/graph";
import type { TenantContext, TenantScopedQueryable } from "@anxionos/database";
import { resolveEventSubject } from "@anxionos/eventing/nats-publisher";
import {
	buildAgencyTenantContext,
	createOrganizationsDb,
} from "@anxionos/organizations";

/** @deprecated Prefer `buildAgencyTenantContext` from `@anxionos/organizations`. */
export const resolveAgencyTenantContext = buildAgencyTenantContext;

/** JetStream prefix for agency-scoped domain events (ADR0007 / ANX-257). */
export function resolveAgencyNatsSubjectPrefix(agencyId: string): string {
	return `agency.${agencyId}.events.`;
}

/** Graph Kernel acting scope for agency-bound API requests (ADR0007 / ANX-258). */
export function resolveAgencyGraphScope(
	agencyId: string,
	principalId: string,
): ScopeContext {
	return {
		principalId,
		actingScope: {
			scopeType: "AGENCY",
			scopeId: agencyId,
		},
	};
}

/** Unified API bootstrap: RLS tenant context + NATS prefix + graph acting scope. */
export interface AgencyBootstrapContext {
	readonly tenant: TenantContext;
	readonly natsSubjectPrefix: string;
	readonly graphScope: ScopeContext;
	resolveEventSubject(eventType: string): string;
}

export function buildAgencyBootstrapContext(
	agencyId: string,
	principalId: string,
): AgencyBootstrapContext {
	const tenant = buildAgencyTenantContext(agencyId, principalId);
	return {
		tenant,
		natsSubjectPrefix: resolveAgencyNatsSubjectPrefix(agencyId),
		graphScope: resolveAgencyGraphScope(agencyId, principalId),
		resolveEventSubject: (eventType: string) =>
			resolveEventSubject(eventType, agencyId),
	};
}

export type AgencyScopedReadRepositories = Pick<
	ReturnType<typeof createOrganizationsDb>,
	"agencyRepository" | "membershipRepository"
>;

/** Runs a read query with RLS session vars (app.tenant_id / app.agency_id). */
export async function runAgencyScopedRead<T>(
	scopedPool: TenantScopedQueryable,
	agencyId: string,
	principalId: string,
	work: (repos: AgencyScopedReadRepositories) => Promise<T>,
): Promise<T> {
	return scopedPool.withContext(
		buildAgencyTenantContext(agencyId, principalId),
		async (client) => {
			const orgDb = createOrganizationsDb(client);
			return work({
				agencyRepository: orgDb.agencyRepository,
				membershipRepository: orgDb.membershipRepository,
			});
		},
	);
}
