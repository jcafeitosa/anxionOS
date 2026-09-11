import type { TenantScopedQueryable } from "@anxionos/database";
import type { HealthDeps } from "@anxionos/contracts";
import type { GrantRepository } from "@anxionos/governance";
import type { PrincipalRepository } from "@anxionos/identity";
import type { betterAuth } from "better-auth";
import { Elysia } from "elysia";
import { agencyIdParamSchema } from "../governance/handlers/grants";
import { operationsOpenApi } from "../openapi-operations";
import { parseIdempotencyKey } from "../organizations/middleware/idempotency-key";
import { requireAgencyMembership } from "../organizations/middleware/require-agency-membership";
import { requireAgencyMutationRole } from "../organizations/middleware/require-agency-mutation-role";
import { resolvePrincipalFromSession } from "../organizations/resolve-principal";
import type { OperationsApiRuntime } from "./bootstrap";
import { mapOperationsError } from "./error-handler";
import {
	handleGetIncident,
	handleListIncidents,
} from "./handlers/incident-queries";
import {
	handleAttachIncidentRunbook,
	handleOpenIncident,
	handleTransitionIncidentStatus,
	incidentIdParamSchema,
} from "./handlers/incidents";
import {
	handleGetRecoveryTask,
	handleListRecoveryTasksByIncident,
} from "./handlers/recovery-task-queries";
import {
	handleApproveRecoveryTask,
	handleCancelRecoveryTask,
	handleCompleteRecoveryTask,
	handleFailRecoveryTask,
	handleStartRecoveryTask,
	handleStartRecoveryTaskExecution,
	recoveryTaskIdParamSchema,
} from "./handlers/recovery-tasks";
import {
	handleGetPlatformHealth,
	handleListPlatformIncidents,
	requirePlatformConsoleGrant,
} from "./handlers/platform-queries";

export interface OperationsPluginDeps extends OperationsApiRuntime {
	auth: ReturnType<typeof betterAuth>;
	identityRepository: PrincipalRepository;
	scopedPool: TenantScopedQueryable;
	grantRepository: GrantRepository;
	probePlatformHealth: () => Promise<HealthDeps>;
}

function requestIdFrom(headers: Headers): string | undefined {
	return headers.get("x-request-id") ?? undefined;
}

async function resolveSessionPrincipal(
	deps: OperationsPluginDeps,
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

export function createOperationsPlugin(deps: OperationsPluginDeps) {
	return new Elysia({ name: "operations", prefix: "/v1/operations" })
		.onError(({ error, set, request }) => {
			const mapped = mapOperationsError(error, requestIdFrom(request.headers));
			set.status = mapped.status;
			return mapped.body;
		})
		.group("/platform", (platform) =>
			platform
				.resolve(async ({ request }) => {
					const { principal } = await resolveSessionPrincipal(
						deps,
						request,
					);
					await requirePlatformConsoleGrant(
						deps.grantRepository,
						principal.id,
					);
					return { principal };
				})
				.get(
					"/health",
					() => handleGetPlatformHealth(deps.probePlatformHealth),
					operationsOpenApi.getPlatformHealth,
				)
				.get(
					"/incidents",
					() => handleListPlatformIncidents(),
					operationsOpenApi.listPlatformIncidents,
				),
		)
		.group("/agencies/:agencyId", (scoped) =>
			scoped
				.group("", (readRoutes) =>
					readRoutes
						.resolve(async ({ request, params }) => {
							const { agencyId } = agencyIdParamSchema.parse(params);
							const { principal } = await resolveSessionPrincipal(
								deps,
								request,
							);
							await requireAgencyMembership(
								deps.scopedPool,
								agencyId,
								principal.id,
							);
							return { principal, agencyId };
						})
						.get(
							"/incidents",
							({ agencyId }) =>
								handleListIncidents(deps, { agencyId }),
							operationsOpenApi.listIncidents,
						)
						.get(
							"/incidents/:incidentId",
							({ agencyId, params }) => {
								const { incidentId } =
									incidentIdParamSchema.parse(params);
								return handleGetIncident(deps, {
									agencyId,
									incidentId,
								});
							},
							operationsOpenApi.getIncident,
						)
						.get(
							"/recovery-tasks/:recoveryTaskId",
							({ agencyId, params }) => {
								const { recoveryTaskId } =
									recoveryTaskIdParamSchema.parse(params);
								return handleGetRecoveryTask(deps, {
									agencyId,
									recoveryTaskId,
								});
							},
							operationsOpenApi.getRecoveryTask,
						)
						.get(
							"/incidents/:incidentId/recovery-tasks",
							({ agencyId, params }) => {
								const { incidentId } =
									incidentIdParamSchema.parse(params);
								return handleListRecoveryTasksByIncident(deps, {
									agencyId,
									incidentId,
								});
							},
							operationsOpenApi.listRecoveryTasksByIncident,
						),
				)
				.group("", (writeRoutes) =>
					writeRoutes
						.resolve(async ({ request, params }) => {
							const { agencyId } = agencyIdParamSchema.parse(params);
							const { principal } = await resolveSessionPrincipal(
								deps,
								request,
							);
							await requireAgencyMutationRole(
								deps.scopedPool,
								agencyId,
								principal.id,
							);
							return { principal, agencyId };
						})
						.post(
							"/incidents",
							async ({ request, agencyId }) => {
								const commandId = parseIdempotencyKey(request.headers);
								const body = await request.json();
								return handleOpenIncident(deps, {
									commandId,
									agencyId,
									body,
								});
							},
							operationsOpenApi.openIncident,
						)
						.post(
							"/incidents/:incidentId/transition-status",
							async ({ request, agencyId, params }) => {
								const { incidentId } =
									incidentIdParamSchema.parse(params);
								const commandId = parseIdempotencyKey(request.headers);
								const body = await request.json();
								return handleTransitionIncidentStatus(deps, {
									commandId,
									agencyId,
									incidentId,
									body,
								});
							},
							operationsOpenApi.transitionIncidentStatus,
						)
						.post(
							"/incidents/:incidentId/attach-runbook",
							async ({ request, agencyId, principal, params }) => {
								const { incidentId } =
									incidentIdParamSchema.parse(params);
								const commandId = parseIdempotencyKey(request.headers);
								const body = await request.json();
								return handleAttachIncidentRunbook(deps, {
									commandId,
									agencyId,
									incidentId,
									principalId: principal.id,
									body,
								});
							},
							operationsOpenApi.attachIncidentRunbook,
						)
						.post(
							"/incidents/:incidentId/recovery-tasks",
							async ({ request, agencyId, principal, params }) => {
								const { incidentId } =
									incidentIdParamSchema.parse(params);
								const commandId = parseIdempotencyKey(request.headers);
								const body = await request.json();
								return handleStartRecoveryTask(deps, {
									commandId,
									agencyId,
									incidentId,
									principalId: principal.id,
									body,
								});
							},
							operationsOpenApi.startRecoveryTask,
						)
						.post(
							"/recovery-tasks/:recoveryTaskId/approve",
							async ({ request, agencyId, principal, params }) => {
								const { recoveryTaskId } =
									recoveryTaskIdParamSchema.parse(params);
								const commandId = parseIdempotencyKey(request.headers);
								const body = await request.json();
								return handleApproveRecoveryTask(deps, {
									commandId,
									agencyId,
									recoveryTaskId,
									principalId: principal.id,
									body,
								});
							},
							operationsOpenApi.approveRecoveryTask,
						)
						.post(
							"/recovery-tasks/:recoveryTaskId/start-execution",
							async ({ request, agencyId, params }) => {
								const { recoveryTaskId } =
									recoveryTaskIdParamSchema.parse(params);
								const commandId = parseIdempotencyKey(request.headers);
								const body = await request.json();
								return handleStartRecoveryTaskExecution(deps, {
									commandId,
									agencyId,
									recoveryTaskId,
									body,
								});
							},
							operationsOpenApi.startRecoveryTaskExecution,
						)
						.post(
							"/recovery-tasks/:recoveryTaskId/complete",
							async ({ request, agencyId, principal, params }) => {
								const { recoveryTaskId } =
									recoveryTaskIdParamSchema.parse(params);
								const commandId = parseIdempotencyKey(request.headers);
								const body = await request.json();
								return handleCompleteRecoveryTask(deps, {
									commandId,
									agencyId,
									recoveryTaskId,
									principalId: principal.id,
									body,
								});
							},
							operationsOpenApi.completeRecoveryTask,
						)
						.post(
							"/recovery-tasks/:recoveryTaskId/fail",
							async ({ request, agencyId, principal, params }) => {
								const { recoveryTaskId } =
									recoveryTaskIdParamSchema.parse(params);
								const commandId = parseIdempotencyKey(request.headers);
								const body = await request.json();
								return handleFailRecoveryTask(deps, {
									commandId,
									agencyId,
									recoveryTaskId,
									principalId: principal.id,
									body,
								});
							},
							operationsOpenApi.failRecoveryTask,
						)
						.post(
							"/recovery-tasks/:recoveryTaskId/cancel",
							async ({ request, agencyId, principal, params }) => {
								const { recoveryTaskId } =
									recoveryTaskIdParamSchema.parse(params);
								const commandId = parseIdempotencyKey(request.headers);
								const body = await request.json();
								return handleCancelRecoveryTask(deps, {
									commandId,
									agencyId,
									recoveryTaskId,
									principalId: principal.id,
									body,
								});
							},
							operationsOpenApi.cancelRecoveryTask,
						),
				),
		);
}
