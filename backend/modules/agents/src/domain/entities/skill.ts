export interface Skill {
	id: string;
	organizationId: string;
	agencyId?: string;
	slug: string;
	displayName: string;
	description?: string;
	revision: number;
	createdAt: Date;
	updatedAt: Date;
}
