import { institutionalUuidSchema } from "@anxionos/contracts";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	emailAddressSchema,
	IDENTITY_EVENT_TYPES,
	principalIdSchema,
	principalKindSchema,
	principalRevisionSchema,
	principalStatusSchema,
} from "@anxionos/contracts/identity";
import { z } from "zod";

/**
 * Contrato de projeção consumido pelo módulo `graph` (D-IDN-020). O projector
 * vive no `graph` — aqui fica apenas o **contrato** e o mapeamento evento→nó,
 * para que nenhum dos dois lados invente um shape diferente.
 *
 * Invariantes de segurança:
 * - `.strict()`: campo extra (token, segredo, hash) **falha** em vez de passar;
 * - nenhum evento de sessão ou de credencial projeta (eles não geram nó);
 * - `authUserId` nunca entra no nó — é detalhe do boundary Better Auth (D-IDN-003).
 */
export const identityUserProjectionNodeSchema = z
	.object({
		nodeKey: z.string().regex(/^user:[0-9a-f-]{36}$/i, "user:<principalId>"),
		principalId: principalIdSchema,
		/**
		 * Presente apenas no evento de registro. Eventos de status fazem *patch*
		 * do nó (status/revision), preservando o e-mail já projetado — por isso
		 * é opcional aqui.
		 */
		email: emailAddressSchema.optional(),
		/**
		 * `kind` e `revision` so existem no evento de registro; eventos de status
		 * sao *patch* (o projector preserva o que ja tem). Default aqui seria
		 * mentira: rotularia um service principal como `human`.
		 */
		kind: principalKindSchema.optional(),
		status: principalStatusSchema,
		revision: principalRevisionSchema.optional(),
		ownerDomain: z.literal("identity"),
		eventId: institutionalUuidSchema,
		checkpoint: z.string().datetime(),
	})
	.strict();

export type IdentityUserProjectionNode = z.infer<
	typeof identityUserProjectionNodeSchema
>;

/** Eventos que produzem/atualizam o nó `:User`. */
export const IDENTITY_USER_PROJECTED_EVENT_TYPES = [
	IDENTITY_EVENT_TYPES.PRINCIPAL_REGISTERED,
	IDENTITY_EVENT_TYPES.PRINCIPAL_SUSPENDED,
	IDENTITY_EVENT_TYPES.PRINCIPAL_REACTIVATED,
	IDENTITY_EVENT_TYPES.PRINCIPAL_REVOKED,
] as const;

/**
 * Projeta um envelope de identidade no nó `:User`, ou `null` quando o evento não
 * pertence à projeção (sessões, credenciais, e-mail e vínculo de auth não mudam
 * o nó — e-mail é PII sincronizada no `Principal` do PG, não no grafo).
 */
export function toIdentityUserProjectionNode(
	envelope: DomainEventEnvelope,
): IdentityUserProjectionNode | null {
	if (
		!IDENTITY_USER_PROJECTED_EVENT_TYPES.includes(
			envelope.eventType as (typeof IDENTITY_USER_PROJECTED_EVENT_TYPES)[number],
		)
	) {
		return null;
	}
	const payload = envelope.payload as {
		principalId?: unknown;
		email?: unknown;
		kind?: unknown;
		revision?: unknown;
	};
	if (typeof payload.principalId !== "string") {
		return null;
	}
	const status =
		envelope.eventType === IDENTITY_EVENT_TYPES.PRINCIPAL_SUSPENDED
			? "suspended"
			: envelope.eventType === IDENTITY_EVENT_TYPES.PRINCIPAL_REVOKED
				? "revoked"
				: "active";
	// Cada atributo OPCIONAL e validado isoladamente: um campo corrompido no
	// envelope nao pode descartar o no inteiro (perda silenciosa de projecao).
	// O que nao valida e omitido; o que valida e projetado.
	const email = emailAddressSchema.safeParse(payload.email);
	const kind = principalKindSchema.safeParse(payload.kind);
	const revision = principalRevisionSchema.safeParse(payload.revision);
	const candidate = {
		nodeKey: `user:${payload.principalId}`,
		principalId: payload.principalId,
		// O evento `registered` é o único que carrega e-mail; atualizações de
		// e-mail não reprojetam (decisão registrada em R11).
		...(email.success ? { email: email.data } : {}),
		...(kind.success ? { kind: kind.data } : {}),
		status,
		...(revision.success ? { revision: revision.data } : {}),
		ownerDomain: envelope.ownerDomain,
		eventId: envelope.eventId,
		checkpoint: envelope.occurredAt,
	};
	const parsed = identityUserProjectionNodeSchema.safeParse(candidate);
	return parsed.success ? parsed.data : null;
}

/** Nomes de atributo proibidos no nó — usado por testes e revisão de contrato. */
export const IDENTITY_PROJECTION_FORBIDDEN_ATTRIBUTES = [
	"authUserId",
	"auth_user_id",
	"secretHash",
	"secret_hash",
	"password",
	"token",
	"accessToken",
	"refreshToken",
	"sessionToken",
	"cookie",
	"externalRefHash",
] as const;
