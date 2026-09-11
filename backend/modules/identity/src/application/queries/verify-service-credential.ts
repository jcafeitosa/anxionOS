import type { ServiceCredentialCrypto } from "../../domain/ports/service-credential-crypto";
import type { ServiceCredentialRepository } from "../../domain/ports/service-credential-repository";

export type ServiceCredentialVerification =
	| {
			valid: true;
			credentialId: string;
			serviceIdentityId: string;
			prefix: string;
	  }
	| {
			valid: false;
			reason:
				| "malformed"
				| "not_found"
				| "revoked"
				| "rotated"
				| "expired"
				| "mismatch";
	  };

export interface VerifyServiceCredentialDeps {
	serviceCredentialRepository: ServiceCredentialRepository;
	crypto: ServiceCredentialCrypto;
}

/**
 * Verifies a delivered key (`<prefix>.<secret>`) against the stored hash.
 *
 * Fail-closed and reason-discriminating: an unknown, revoked, rotated or
 * expired credential never authenticates, and the secret comparison is
 * constant-time inside the crypto adapter. Expiry is evaluated against `asOf`
 * so callers can test windows without freezing the clock.
 */
export async function verifyServiceCredential(
	deps: VerifyServiceCredentialDeps,
	key: string,
	asOf: Date = new Date(),
): Promise<ServiceCredentialVerification> {
	const parsed = deps.crypto.parseKey(key);
	if (!parsed) {
		return { valid: false, reason: "malformed" };
	}
	const credential = await deps.serviceCredentialRepository.findByPrefix(
		parsed.prefix,
	);
	if (!credential) {
		return { valid: false, reason: "not_found" };
	}
	if (credential.status === "revoked") {
		return { valid: false, reason: "revoked" };
	}
	if (credential.status === "rotated") {
		return { valid: false, reason: "rotated" };
	}
	if (credential.status === "expired") {
		return { valid: false, reason: "expired" };
	}
	if (credential.expiresAt && credential.expiresAt <= asOf) {
		return { valid: false, reason: "expired" };
	}
	if (!deps.crypto.verify(parsed.secret, credential.secretHash)) {
		return { valid: false, reason: "mismatch" };
	}
	return {
		valid: true,
		credentialId: credential.id,
		serviceIdentityId: credential.serviceIdentityId,
		prefix: credential.prefix,
	};
}
