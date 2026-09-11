import type { TenantScopedQueryable } from "@anxionos/database";
import type { PrincipalRepository } from "@anxionos/identity";
import type { betterAuth } from "better-auth";
import { Elysia } from "elysia";
import { agencyIdParamSchema } from "../governance/handlers/grants";
import { evaluationOpenApi } from "../openapi-operations";
import { parseIdempotencyKey } from "../organizations/middleware/idempotency-key";
import { requireAgencyMembership } from "../organizations/middleware/require-agency-membership";
import { requireAgencyMutationRole } from "../organizations/middleware/require-agency-mutation-role";
import { resolvePrincipalFromSession } from "../organizations/resolve-principal";
import type { EvaluationApiRuntime } from "./bootstrap";
import { mapEvaluationError } from "./error-handler";
import { handleGetCertificationBySubject } from "./handlers/certification-queries";
import { handleIssueCertification } from "./handlers/commands";
import {
	evaluationRecordIdParamSchema,
	handleGetEvaluationRecord,
	handleGetEvaluationScore,
} from "./handlers/record-queries";

export interface EvaluationPluginDeps extends EvaluationApiRuntime {
	auth: ReturnType<typeof betterAuth>;
	identityRepository: PrincipalRepository;
	scopedPool: TenantScopedQueryable;
}

function requestIdFrom(headers: Headers): string | undefined {
	return headers.get("x-request-id") ?? undefined;
}

async function resolveSessionPrincipal(
	deps: EvaluationPluginDeps,
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

export function createEvaluationPlugin(deps: EvaluationPluginDeps) {
	return new Elysia({ name: "evaluation", prefix: "/v1/evaluation" })
		.onError(({ error, set, request }) => {
			const mapped = mapEvaluationError(error, requestIdFrom(request.headers));
			set.status = mapped.status;
			return mapped.body;
		})
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
							"/certifications",
							({ agencyId, query }) =>
								handleGetCertificationBySubject(deps, {
									agencyId,
									query,
								}),
							evaluationOpenApi.getCertificationBySubject,
						)
						.get(
							"/evaluation-records/:evaluationRecordId",
							({ agencyId, params }) => {
								const { evaluationRecordId } =
									evaluationRecordIdParamSchema.parse(params);
								return handleGetEvaluationRecord(deps, {
									agencyId,
									evaluationRecordId,
								});
							},
							evaluationOpenApi.getEvaluationRecord,
						)
						.get(
							"/evaluation-records/:evaluationRecordId/score",
							({ agencyId, params }) => {
								const { evaluationRecordId } =
									evaluationRecordIdParamSchema.parse(params);
								return handleGetEvaluationScore(deps, {
									agencyId,
									evaluationRecordId,
								});
							},
							evaluationOpenApi.getEvaluationScore,
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
							"/certifications",
							async ({ request, agencyId }) => {
								const commandId = parseIdempotencyKey(request.headers);
								const body = await request.json();
								return handleIssueCertification(deps, {
									commandId,
									agencyId,
									body,
								});
							},
							evaluationOpenApi.issueCertification,
						),
				),
		);
}
