/**
 * Generation and verification of service credential material (R03
 * ServiceCredentialRef). The port keeps `node:crypto` out of the application
 * layer and lets tests inject deterministic material.
 */
export interface GeneratedServiceCredential {
	prefix: string;
	/** Plaintext secret — returned once to the caller of the command. */
	secret: string;
	/** Persisted verification material; never the secret itself. */
	secretHash: string;
}

export interface ServiceCredentialCrypto {
	generate(): GeneratedServiceCredential;
	hash(secret: string): string;
	verify(secret: string, secretHash: string): boolean;
}
