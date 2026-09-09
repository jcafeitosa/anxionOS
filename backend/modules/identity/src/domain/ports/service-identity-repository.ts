import type {
	NewServiceIdentity,
	ServiceIdentity,
} from "../entities/service-identity";

export interface ServiceIdentityRepository {
	findById(id: string): Promise<ServiceIdentity | null>;
	findActiveByPrincipalId(principalId: string): Promise<ServiceIdentity[]>;
	create(input: NewServiceIdentity): Promise<ServiceIdentity>;
	revoke(id: string, revokedAt: Date): Promise<ServiceIdentity | null>;
}
