import type { TenantScopedQueryable } from "@anxionos/database";
import type {
	AgentRepository,
	AgentVersionRepository,
	AgentsUnitOfWork,
	CommandJournalRepository,
} from "@anxionos/agents";
import type { createOrganizationsDb } from "@anxionos/organizations";
import type { betterAuth } from "better-auth";
import { Elysia } from "elysia";
import { mapAgentsError } from "./error-handler";
import {
	agentIdParamSchema,
	handleGetAgent,
	handleListAgentVersions,
	handlePublishAgentVersion,
	handleRegisterAgent,
} from "./handlers/agents";
import { agencyIdParamSchema } from "../governance/handlers/grants";
import { parseIdempotencyKey } from "../organizations/middleware/idempotency-key";
import { requireAgencyMembership } from "../organizations/middleware/require-agency-membership";
import { resolvePrincipalFromSession } from "../organizations/resolve-principal";
import type { PrincipalRepository } from "@anxionos/identity";

type OrganizationsDb = ReturnType<typeof createOrganizationsDb>;

export interface AgentsPluginDeps {
	auth: ReturnType<typeof betterAuth>;
	agentRepository: AgentRepository;
	agentVersionRepository: AgentVersionRepository;
	commandJournal: CommandJournalRepository;
	unitOfWork: AgentsUnitOfWork;
	membershipRepository: OrganizationsDb["membershipRepository"];
	scopedPool: TenantScopedQueryable;
	identityRepository: PrincipalRepository;
}

function requestIdFrom(headers: Headers): string | undefined {
	return headers.get("x-request-id") ?? undefined;
}

async function resolveSessionPrincipal(
	deps: AgentsPluginDeps,
	request: Request,
) {
	const session = await deps.auth.api.getSession({ headers: request.headers });
	if (!session?.user?.id) {
		const { AppError } = await import("@anxionos/contracts/errors");
		throw AppError.unauthorized();
	}
	const principal = await resolvePrincipalFromSession(
		deps.identityRepository,
		session.user.id,
	);
	return { session, principal };
}

export function createAgentsPlugin(deps: AgentsPluginDeps) {
	return new Elysia({ name: "agents", prefix: "/v1/agencies" })
		.onError(({ error, set, request }) => {
			const mapped = mapAgentsError(error, requestIdFrom(request.headers));
			set.status = mapped.status;
			return mapped.body;
		})
		.group("/:agencyId/agents", (scoped) =>
			scoped
				.resolve(async ({ request, params }) => {
					const { agencyId } = agencyIdParamSchema.parse(params);
					const { principal } = await resolveSessionPrincipal(deps, request);
					await requireAgencyMembership(
						deps.scopedPool,
						agencyId,
						principal.id,
					);
					return { principal, agencyId };
				})
				.post("", async ({ request, agencyId, principal }) => {
					const commandId = parseIdempotencyKey(request.headers);
					const body = await request.json();
					return handleRegisterAgent(deps, {
						commandId,
						agencyId,
						principalId: principal.id,
						body,
					});
				})
				.get("/:agentId", ({ agencyId, params }) => {
					const { agentId } = agentIdParamSchema.parse(params);
					return handleGetAgent(deps, { agencyId, agentId });
				})
				.get("/:agentId/versions", ({ agencyId, params }) => {
					const { agentId } = agentIdParamSchema.parse(params);
					return handleListAgentVersions(deps, { agencyId, agentId });
				})
				.post("/:agentId/versions", async ({ request, agencyId, params, principal }) => {
					const { agentId } = agentIdParamSchema.parse(params);
					const commandId = parseIdempotencyKey(request.headers);
					const body = await request.json();
					return handlePublishAgentVersion(deps, {
						commandId,
						agencyId,
						agentId,
						principalId: principal.id,
						body,
					});
				}),
		);
}
