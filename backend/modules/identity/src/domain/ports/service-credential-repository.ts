import type {
	NewServiceCredential,
	ServiceCredential,
} from "../entities/service-credential";

export interface ServiceCredentialRepository {
	findById(id: string): Promise<ServiceCredential | null>;
	findByPrefix(prefix: string): Promise<ServiceCredential | null>;
	listByServiceIdentityId(
		serviceIdentityId: string,
	): Promise<ServiceCredential[]>;
	/** Active credentials only (excludes rotated/revoked/expired rows). */
	findActiveByServiceIdentityId(
		serviceIdentityId: string,
	): Promise<ServiceCredential[]>;
	create(input: NewServiceCredential): Promise<ServiceCredential>;
	/** Marks the credential as superseded by `rotatedToId` (idempotent by status). */
	markRotated(
		id: string,
		rotatedToId: string,
		rotatedAt: Date,
	): Promise<ServiceCredential | null>;
	revoke(id: string, revokedAt: Date): Promise<ServiceCredential | null>;
	/** Revokes every active credential of a service identity; returns transitions. */
	revokeActiveByServiceIdentityId(
		serviceIdentityId: string,
		revokedAt: Date,
	): Promise<ServiceCredential[]>;
}
