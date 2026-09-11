import type {
	GeneratedServiceCredential,
	ServiceCredentialCrypto,
} from "../../domain/ports/service-credential-crypto";
import {
	generateServiceCredential,
	hashServiceCredentialSecret,
	parseServiceCredentialKey,
	verifyServiceCredentialSecret,
} from "./credential-crypto";

/** Production adapter for the `ServiceCredentialCrypto` port (scrypt-based). */
export function createServiceCredentialCrypto(): ServiceCredentialCrypto {
	return {
		generate(): GeneratedServiceCredential {
			return generateServiceCredential();
		},
		hash(secret: string): string {
			return hashServiceCredentialSecret(secret);
		},
		verify(secret: string, secretHash: string): boolean {
			return verifyServiceCredentialSecret(secret, secretHash);
		},
		parseKey(key: string) {
			return parseServiceCredentialKey(key);
		},
	};
}
