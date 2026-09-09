export {};

export interface Owner {
    id: string;
    principalId: string;
    defaultOrganizationId?: string;
    createdAt: Date;
}
export interface NewOwner {
    principalId: string;
    defaultOrganizationId?: string;
}
