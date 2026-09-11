import type {
	PrincipalDto,
	ServiceCredentialDto,
	SessionRefDto,
} from "@anxionos/contracts/identity";
import type { Principal } from "../domain/entities/principal";
import type { ServiceCredential } from "../domain/entities/service-credential";
import type { SessionRef } from "../domain/entities/session-ref";

/**
 * DTO presenters. These are the only shapes allowed to cross the HTTP/agent
 * boundary (R04): `authUserId`, `secretHash` and `externalRefHash` are dropped
 * here by construction.
 */
export function toPrincipalDto(principal: Principal): PrincipalDto {
	return {
		id: principal.id,
		email: principal.email,
		kind: principal.kind,
		status: principal.status,
		revision: principal.revision,
		createdAt: principal.createdAt.toISOString(),
		...(principal.suspendedAt
			? { suspendedAt: principal.suspendedAt.toISOString() }
			: {}),
		...(principal.suspensionReason
			? {
					suspensionReason:
						principal.suspensionReason as PrincipalDto["suspensionReason"],
				}
			: {}),
		...(principal.revokedAt
			? { revokedAt: principal.revokedAt.toISOString() }
			: {}),
		...(principal.revocationReason
			? {
					revocationReason:
						principal.revocationReason as PrincipalDto["revocationReason"],
				}
			: {}),
	};
}

export function toSessionRefDto(sessionRef: SessionRef): SessionRefDto {
	return {
		sessionRefId: sessionRef.id,
		principalId: sessionRef.principalId,
		status: sessionRef.status,
		createdAt: sessionRef.createdAt.toISOString(),
		...(sessionRef.revokedAt
			? { revokedAt: sessionRef.revokedAt.toISOString() }
			: {}),
		...(sessionRef.revocationReason
			? { revocationReason: sessionRef.revocationReason }
			: {}),
	};
}

export function toServiceCredentialDto(
	credential: ServiceCredential,
): ServiceCredentialDto {
	return {
		credentialId: credential.id,
		serviceIdentityId: credential.serviceIdentityId,
		prefix: credential.prefix,
		status: credential.status,
		issuedAt: credential.issuedAt.toISOString(),
		...(credential.expiresAt
			? { expiresAt: credential.expiresAt.toISOString() }
			: {}),
		...(credential.rotatedAt
			? { rotatedAt: credential.rotatedAt.toISOString() }
			: {}),
		...(credential.revokedAt
			? { revokedAt: credential.revokedAt.toISOString() }
			: {}),
	};
}
