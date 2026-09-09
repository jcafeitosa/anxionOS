export type PrincipalStatus = "active" | "suspended";

export interface Principal {
	id: string;
	authUserId: string;
	email: string;
	status: PrincipalStatus;
	createdAt: Date;
	suspendedAt: Date | null;
	suspensionReason: string | null;
}

export interface NewPrincipal {
	authUserId: string;
	email: string;
}
