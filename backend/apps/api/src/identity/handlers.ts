import { institutionalUuidSchema } from "@anxionos/contracts";
import {
	principalRevisionSchema,
	recordSessionRevokedCommandSchema,
	registerPrincipalCommandSchema,
	revocationReasonCodeSchema,
	revokePrincipalCommandSchema,
	suspendPrincipalCommandSchema,
	suspensionReasonCodeSchema,
} from "@anxionos/contracts/identity";
import {
	getPrincipalById,
	listRevokedSessions,
	listSessions,
	recordSessionRevoked,
	registerPrincipal,
	revokePrincipal,
	suspendPrincipal,
	throwIdentityError,
	toPrincipalDto,
} from "@anxionos/identity";
import { z } from "zod";
import { parseIdempotencyKey } from "../organizations/middleware/idempotency-key";
import { requireIdentityGrant, requireSelfOrGrant } from "./authorization";
import type { IdentityPluginDeps } from "./deps";

const principalIdParamsSchema = z.object({
	principalId: institutionalUuidSchema,
});
const revokedQuerySchema = z.object({
	since: z.string().datetime().optional(),
});

const registerBodySchema = registerPrincipalCommandSchema.omit({
	commandId: true,
});
// Corpo OPCIONAL (R04/OpenAPI): defaults por campo, para que `{}` e ausencia de
// corpo tenham o mesmo efeito. `.default()` no objeto nao dispara com `{}`.
const suspendBodySchema = z
	.object({
		reasonCode: suspensionReasonCodeSchema.default("ops.manual"),
		expectedRevision: principalRevisionSchema.optional(),
	})
	.strict();
const revokeBodySchema = z
	.object({
		reasonCode: revocationReasonCodeSchema.default("ops.manual"),
		expectedRevision: principalRevisionSchema.optional(),
	})
	.strict();
const revokeSessionBodySchema = recordSessionRevokedCommandSchema.omit({
	commandId: true,
});

export interface IdentityRequestContext {
	actorPrincipalId: string;
	agencyId?: string;
}

/** GET /v1/identity/principals/:principalId */
export async function handleGetPrincipal(
	deps: IdentityPluginDeps,
	input: IdentityRequestContext & { params: unknown },
) {
	const { principalId } = principalIdParamsSchema.parse(input.params);
	await requireSelfOrGrant(deps, {
		actorPrincipalId: input.actorPrincipalId,
		targetPrincipalId: principalId,
		capability: "identity.read",
		agencyId: input.agencyId,
	});
	const principal = await getPrincipalById(
		deps.identityRepository,
		principalId,
	);
	if (!principal) {
		throwIdentityError("IDN_PRINCIPAL_NOT_FOUND", "Principal not found");
	}
	return { principal: toPrincipalDto(principal) };
}

/** GET /v1/identity/principals/:principalId/sessions */
export async function handleListSessions(
	deps: IdentityPluginDeps,
	input: IdentityRequestContext & { params: unknown },
) {
	const { principalId } = principalIdParamsSchema.parse(input.params);
	await requireSelfOrGrant(deps, {
		actorPrincipalId: input.actorPrincipalId,
		targetPrincipalId: principalId,
		capability: "identity.read",
		agencyId: input.agencyId,
	});
	const sessions = await listSessions(
		{ sessionRefRepository: deps.sessionRefRepository },
		principalId,
	);
	return { sessions };
}

/** POST /v1/identity/principals */
export async function handleRegisterPrincipal(
	deps: IdentityPluginDeps,
	input: IdentityRequestContext & { headers: Headers; body: unknown },
) {
	const commandId = parseIdempotencyKey(input.headers);
	await requireIdentityGrant(deps, {
		principalId: input.actorPrincipalId,
		capability: "identity.admin",
		agencyId: input.agencyId,
	});
	const body = registerBodySchema.parse(input.body ?? {});
	const principal = await registerPrincipal(
		{
			repository: deps.identityRepository,
			unitOfWork: deps.identityUnitOfWork,
		},
		{ ...body, commandId },
	);
	return { principal: toPrincipalDto(principal) };
}

/** POST /v1/identity/principals/:principalId/suspend */
export async function handleSuspendPrincipal(
	deps: IdentityPluginDeps,
	input: IdentityRequestContext & {
		params: unknown;
		headers: Headers;
		body: unknown;
	},
) {
	const { principalId } = principalIdParamsSchema.parse(input.params);
	const commandId = parseIdempotencyKey(input.headers);
	await requireIdentityGrant(deps, {
		principalId: input.actorPrincipalId,
		capability: "identity.admin",
		agencyId: input.agencyId,
	});
	const body = suspendBodySchema.parse(input.body ?? {});
	const principal = await suspendPrincipal(
		{
			repository: deps.identityRepository,
			unitOfWork: deps.identityUnitOfWork,
			sessionRevoker: deps.sessionRevoker,
		},
		{
			principalId,
			commandId,
			actorPrincipalId: input.actorPrincipalId,
			reasonCode: body.reasonCode,
			expectedRevision: body.expectedRevision,
		},
	);
	return { principal: toPrincipalDto(principal) };
}

/** POST /v1/identity/principals/:principalId/revoke */
export async function handleRevokePrincipal(
	deps: IdentityPluginDeps,
	input: IdentityRequestContext & {
		params: unknown;
		headers: Headers;
		body: unknown;
	},
) {
	const { principalId } = principalIdParamsSchema.parse(input.params);
	const commandId = parseIdempotencyKey(input.headers);
	await requireIdentityGrant(deps, {
		principalId: input.actorPrincipalId,
		capability: "identity.admin",
		agencyId: input.agencyId,
	});
	const body = revokeBodySchema.parse(input.body ?? {});
	const principal = await revokePrincipal(
		{
			repository: deps.identityRepository,
			unitOfWork: deps.identityUnitOfWork,
			sessionRevoker: deps.sessionRevoker,
		},
		{
			principalId,
			commandId,
			actorPrincipalId: input.actorPrincipalId,
			reasonCode: body.reasonCode,
			expectedRevision: body.expectedRevision,
		},
	);
	return { principal: toPrincipalDto(principal) };
}

/** POST /v1/identity/sessions/revoke — capability `identity.session.revoke`. */
export async function handleRevokeSession(
	deps: IdentityPluginDeps,
	input: IdentityRequestContext & { headers: Headers; body: unknown },
) {
	const commandId = parseIdempotencyKey(input.headers);
	const body = revokeSessionBodySchema.parse(input.body ?? {});
	await requireSelfOrGrant(deps, {
		actorPrincipalId: input.actorPrincipalId,
		targetPrincipalId: body.principalId,
		capability: "identity.admin",
		agencyId: input.agencyId,
	});
	const result = await recordSessionRevoked(
		{
			principalRepository: deps.identityRepository,
			sessionRefRepository: deps.sessionRefRepository,
			unitOfWork: deps.identityUnitOfWork,
		},
		{ ...body, commandId },
	);
	return { sessionRef: result.sessionRef, transitioned: result.transitioned };
}

/** GET /v1/identity/sessions/revoked — capability `identity.session.list-revoked`. */
export async function handleListRevokedSessions(
	deps: IdentityPluginDeps,
	input: IdentityRequestContext & { query: unknown },
) {
	await requireIdentityGrant(deps, {
		principalId: input.actorPrincipalId,
		capability: "identity.admin",
		agencyId: input.agencyId,
	});
	const query = revokedQuerySchema.parse(input.query ?? {});
	const sessions = await listRevokedSessions(
		{ sessionRefRepository: deps.sessionRefRepository },
		query.since ? new Date(query.since) : undefined,
	);
	return { sessions };
}
