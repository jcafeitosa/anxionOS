/**
 * R03: ServiceCredentialRef — only the hash/ref of a service credential lives
 * here. The plaintext secret is returned once at issuance and never persisted,
 * logged, published in an event or written to the graph.
 */
export type ServiceCredentialStatus =
	| "active"
	| "rotated"
	| "revoked"
	| "expired";

export interface ServiceCredential {
	id: string;
	serviceIdentityId: string;
	/** Public, non-secret handle (key prefix) used to identify the credential. */
	prefix: string;
	/** Never leaves the domain: absent from DTOs, events and graph projections. */
	secretHash: string;
	status: ServiceCredentialStatus;
	issuedAt: Date;
	expiresAt: Date | null;
	rotatedAt: Date | null;
	/** Credential that superseded this one, when rotated. */
	rotatedToId: string | null;
	revokedAt: Date | null;
}

export interface NewServiceCredential {
	serviceIdentityId: string;
	prefix: string;
	secretHash: string;
	expiresAt?: Date | null;
}
