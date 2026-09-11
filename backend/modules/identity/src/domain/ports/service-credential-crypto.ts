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
	/** Async on purpose: scrypt in the libuv pool instead of blocking the loop. */
	generate(): Promise<GeneratedServiceCredential>;
	hash(secret: string): Promise<string>;
	verify(secret: string, secretHash: string): Promise<boolean>;
	/** Splits a delivered key (`<prefix>.<secret>`) without trusting its shape. */
	parseKey(key: string): { prefix: string; secret: string } | null;
}
