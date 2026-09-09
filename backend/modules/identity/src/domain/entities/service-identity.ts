export type ServiceIdentityStatus = "active" | "revoked";

export interface ServiceIdentity {
	id: string;
	principalId: string;
	label: string;
	status: ServiceIdentityStatus;
	createdAt: Date;
	revokedAt: Date | null;
}

export interface NewServiceIdentity {
	principalId: string;
	label: string;
}
