export type ProjectionInboxStatus = "pending" | "processing" | "acked" | "quarantined";
export interface ProjectionInboxEntry {
    eventId: string;
    consumerName: string;
    ownerDomain: string;
    status: ProjectionInboxStatus;
    checkpoint: number;
    projectionGeneration: number;
    attemptCount: number;
}
export interface ProjectionInboxClaimInput {
    eventId: string;
    consumerName: string;
    ownerDomain: string;
    checkpoint: number;
    projectionGeneration: number;
}
export type ProjectionInboxClaimResult = ProjectionInboxEntry | "already_processed";
/** Port for inbox idempotency (S4 implementation). */
export interface ProjectionInbox {
    find(eventId: string, consumerName: string): Promise<ProjectionInboxEntry | null>;
    tryClaim(input: ProjectionInboxClaimInput): Promise<ProjectionInboxClaimResult>;
    ack(eventId: string, consumerName: string, checkpoint: number): Promise<void>;
    quarantine(eventId: string, consumerName: string, errorCode: string): Promise<void>;
}
