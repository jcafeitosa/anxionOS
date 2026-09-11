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
	// Fail-closed como o irmao GET /principals/:id: sem isto a rota devolveria
	// 200 com atividade de sessao de principal suspenso/revogado (e 200 vazio
	// para UUID inexistente).
	const principal = await getPrincipalById(
		deps.identityRepository,
		principalId,
	);
	if (!principal) {
		throwIdentityError("IDN_PRINCIPAL_NOT_FOUND", "Principal not found");
	}
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
		// O principal criado e' GLOBAL (nasce sem vinculo de agencia) e o replay
		// devolve o DTO de um principal existente — inclusive e-mail. Sem exigir
		// plataforma, um admin de agencia lia e-mail de outro tenant pelo
		// `authUserId` e criava principals globais / fazia squatting de e-mail.
		requirePlatform: true,
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
		targetPrincipalId: principalId,
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
		targetPrincipalId: principalId,
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

/**
 * GET /v1/identity/sessions/revoked — capability `identity.session.list-revoked`.
 *
 * O ledger e' GLOBAL (sessionRefs nao tem dimensao de agencia em identity), entao
 * exige autoridade de PLATAFORMA: sem `agencyId` declarado a checagem resolve
 * para o escopo PLATAFORMA. Antes, um `identity.admin` escopado a propria
 * agencia lia metadados de sessao de todos os tenants (F2 da revalidacao G4).
 */
export async function handleListRevokedSessions(
	deps: IdentityPluginDeps,
	input: IdentityRequestContext & { query: unknown },
) {
	await requireIdentityGrant(deps, {
		principalId: input.actorPrincipalId,
		capability: "identity.admin",
		// Declarar agencia continua validado (membership), mas o ledger e' global:
		// o escopo exigido e' o de plataforma.
		agencyId: input.agencyId,
		requirePlatform: true,
	});
	const query = revokedQuerySchema.parse(input.query ?? {});
	const sessions = await listRevokedSessions(
		{ sessionRefRepository: deps.sessionRefRepository },
		query.since ? new Date(query.since) : undefined,
	);
	return { sessions };
}
