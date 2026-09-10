import type { TenantScopedQueryable } from "@anxionos/database";
import type {
	AgentPublishGuardPort,
	AgentRepository,
	AgentSkillBindingRepository,
	AgentVersionRepository,
	AgentsUnitOfWork,
	BrainInvocationGuardPort,
	CommandJournalRepository,
	SkillBindGuardPort,
	SkillEvaluationGuardPort,
	SkillRepository,
	SkillVersionRepository,
} from "@anxionos/agents";
import type { createOrganizationsDb } from "@anxionos/organizations";
import type { betterAuth } from "better-auth";
import { Elysia } from "elysia";
import { mapAgentsError } from "./error-handler";
import {
	agentIdParamSchema,
	handleGetAgent,
	handleListAgentVersions,
	handleInvokeBrainCapability,
	handlePublishAgentVersion,
	handleRegisterAgent,
	handleRollbackAgentVersion,
	handleTransitionAgentStatus,
} from "./handlers/agents";
import {
	handleBindAgentSkill,
	handleCreateSkillVersion,
	handleRecordSkillVersionEvaluation,
	handleRegisterSkill,
	handleSubmitSkillVersion,
	skillIdParamSchema,
	skillVersionIdParamSchema,
} from "./handlers/skills";
import { agencyIdParamSchema } from "../governance/handlers/grants";
import { agentsOpenApi } from "../openapi-operations";
import { parseIdempotencyKey } from "../organizations/middleware/idempotency-key";
import { requireAgencyMembership } from "../organizations/middleware/require-agency-membership";
import { resolvePrincipalFromSession } from "../organizations/resolve-principal";
import type { PrincipalRepository } from "@anxionos/identity";

type OrganizationsDb = ReturnType<typeof createOrganizationsDb>;

export interface AgentsPluginDeps {
	auth: ReturnType<typeof betterAuth>;
	agentRepository: AgentRepository;
	agentVersionRepository: AgentVersionRepository;
	skillRepository: SkillRepository;
	skillVersionRepository: SkillVersionRepository;
	agentSkillBindingRepository: AgentSkillBindingRepository;
	commandJournal: CommandJournalRepository;
	unitOfWork: AgentsUnitOfWork;
	publishGuard?: AgentPublishGuardPort;
	invocationGuard?: BrainInvocationGuardPort;
	skillBindGuard?: SkillBindGuardPort;
	skillEvaluationGuard?: SkillEvaluationGuardPort;
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
				.post(
					"",
					async ({ request, agencyId, principal }) => {
						const commandId = parseIdempotencyKey(request.headers);
						const body = await request.json();
						return handleRegisterAgent(deps, {
							commandId,
							agencyId,
							principalId: principal.id,
							body,
						});
					},
					agentsOpenApi.register,
				)
				.get(
					"/:agentId",
					({ agencyId, params }) => {
						const { agentId } = agentIdParamSchema.parse(params);
						return handleGetAgent(deps, { agencyId, agentId });
					},
					agentsOpenApi.get,
				)
				.get(
					"/:agentId/versions",
					({ agencyId, params }) => {
						const { agentId } = agentIdParamSchema.parse(params);
						return handleListAgentVersions(deps, { agencyId, agentId });
					},
					agentsOpenApi.listVersions,
				)
				.post(
					"/:agentId/versions",
					async ({ request, agencyId, params, principal }) => {
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
					},
					agentsOpenApi.publishVersion,
				)
				.post(
					"/:agentId/versions/rollback",
					async ({ request, agencyId, params, principal }) => {
					const { agentId } = agentIdParamSchema.parse(params);
					const commandId = parseIdempotencyKey(request.headers);
					const body = await request.json();
					return handleRollbackAgentVersion(deps, {
						commandId,
						agencyId,
						agentId,
						principalId: principal.id,
						body,
					});
					},
					agentsOpenApi.rollbackVersion,
				)
				.patch(
					"/:agentId/status",
					async ({ request, agencyId, params, principal }) => {
					const { agentId } = agentIdParamSchema.parse(params);
					const commandId = parseIdempotencyKey(request.headers);
					const body = await request.json();
					return handleTransitionAgentStatus(deps, {
						commandId,
						agencyId,
						agentId,
						principalId: principal.id,
						body,
					});
					},
					agentsOpenApi.transitionStatus,
				)
				.post(
					"/:agentId/invoke",
					async ({ request, agencyId, params, principal }) => {
					const { agentId } = agentIdParamSchema.parse(params);
					const commandId = parseIdempotencyKey(request.headers);
					const body = await request.json();
					return handleInvokeBrainCapability(deps, {
						commandId,
						agencyId,
						agentId,
						principalId: principal.id,
						body,
					});
					},
					agentsOpenApi.invoke,
				)
				.post(
					"/:agentId/skills/bind",
					async ({ request, agencyId, params, principal }) => {
						const { agentId } = agentIdParamSchema.parse(params);
						const commandId = parseIdempotencyKey(request.headers);
						const body = await request.json();
						return handleBindAgentSkill(deps, {
							commandId,
							agencyId,
							agentId,
							principalId: principal.id,
							body,
						});
					},
					agentsOpenApi.bindSkill,
				),
		)
		.group("/:agencyId/skills", (skillsScoped) =>
			skillsScoped
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
				.post(
					"",
					async ({ request, agencyId, principal }) => {
						const commandId = parseIdempotencyKey(request.headers);
						const body = await request.json();
						return handleRegisterSkill(deps, {
							commandId,
							agencyId,
							principalId: principal.id,
							body,
						});
					},
					agentsOpenApi.registerSkill,
				)
				.post(
					"/:skillId/versions",
					async ({ request, agencyId, params, principal }) => {
						const { skillId } = skillIdParamSchema.parse(params);
						const commandId = parseIdempotencyKey(request.headers);
						const body = await request.json();
						return handleCreateSkillVersion(deps, {
							commandId,
							agencyId,
							skillId,
							principalId: principal.id,
							body,
						});
					},
					agentsOpenApi.createSkillVersion,
				)
				.post(
					"/:skillId/versions/:skillVersionId/submit",
					async ({ request, agencyId, params, principal }) => {
						const { skillId } = skillIdParamSchema.parse(params);
						const { skillVersionId } = skillVersionIdParamSchema.parse(params);
						const commandId = parseIdempotencyKey(request.headers);
						const body = await request.json();
						return handleSubmitSkillVersion(deps, {
							commandId,
							agencyId,
							skillId,
							skillVersionId,
							principalId: principal.id,
							body,
						});
					},
					agentsOpenApi.submitSkillVersion,
				)
				.post(
					"/:skillId/versions/:skillVersionId/evaluate",
					async ({ request, agencyId, params, principal }) => {
						const { skillId } = skillIdParamSchema.parse(params);
						const { skillVersionId } = skillVersionIdParamSchema.parse(params);
						const commandId = parseIdempotencyKey(request.headers);
						const body = await request.json();
						return handleRecordSkillVersionEvaluation(deps, {
							commandId,
							agencyId,
							skillId,
							skillVersionId,
							principalId: principal.id,
							body,
						});
					},
					agentsOpenApi.evaluateSkillVersion,
				),
		);
}
