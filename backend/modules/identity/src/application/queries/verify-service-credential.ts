import type { PrincipalRepository } from "../../domain/ports/principal-repository";
import type { ServiceCredentialCrypto } from "../../domain/ports/service-credential-crypto";
import type { ServiceCredentialRepository } from "../../domain/ports/service-credential-repository";
import type { ServiceIdentityRepository } from "../../domain/ports/service-identity-repository";

export type ServiceCredentialVerification =
	| {
			valid: true;
			credentialId: string;
			serviceIdentityId: string;
			principalId: string;
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
				| "mismatch"
				/** The service identity that owns the credential is not active. */
				| "identity_inactive"
				/** The principal behind the service identity is not ACTIVE. */
				| "principal_inactive";
	  };

export interface VerifyServiceCredentialDeps {
	serviceCredentialRepository: ServiceCredentialRepository;
	serviceIdentityRepository: ServiceIdentityRepository;
	/**
	 * Optional defense-in-depth: when wired, a principal that is not ACTIVE also
	 * fails closed, so a credential cannot outlive its principal's suspension.
	 */
	principalRepository?: PrincipalRepository;
	crypto: ServiceCredentialCrypto;
}

/**
 * Verifies a delivered key (`<prefix>.<secret>`) against the stored hash.
 *
 * Fail-closed and reason-discriminating: an unknown, revoked, rotated or
 * expired credential never authenticates — and neither does a credential whose
 * **service identity** or **principal** is no longer active. A cascading
 * revocation that missed the credential row must not leave a usable key
 * (INV-IDN-01). The secret comparison is constant-time inside the crypto
 * adapter, and expiry is evaluated against `asOf` so callers can test windows
 * without freezing the clock.
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

	// O status do dono faz parte da verificacao: credencial ativa de service
	// identity revogada (ou de principal suspenso/revogado) NAO autentica.
	const serviceIdentity = await deps.serviceIdentityRepository.findById(
		credential.serviceIdentityId,
	);
	if (!serviceIdentity || serviceIdentity.status !== "active") {
		return { valid: false, reason: "identity_inactive" };
	}
	if (deps.principalRepository) {
		const principal = await deps.principalRepository.findById(
			serviceIdentity.principalId,
		);
		if (!principal || principal.status !== "active") {
			return { valid: false, reason: "principal_inactive" };
		}
	}

	if (!(await deps.crypto.verify(parsed.secret, credential.secretHash))) {
		return { valid: false, reason: "mismatch" };
	}
	return {
		valid: true,
		credentialId: credential.id,
		serviceIdentityId: credential.serviceIdentityId,
		principalId: serviceIdentity.principalId,
		prefix: credential.prefix,
	};
}
