export interface DlqEntry {
	dlqId: string;
	eventId: string;
	consumerName: string;
	ownerDomain: string;
	errorCode: string;
	attemptCount: number;
	payloadRef: string;
	replayStatus: string;
	auditManifestId: string | null;
}

export interface DlqReplayPort {
	findById(dlqId: string): Promise<DlqEntry | null>;
	replay(
		dlqId: string,
		auditManifestId: string,
	): Promise<"replayed" | "already_replayed">;
	resetInboxForReplay(eventId: string, consumerName: string): Promise<void>;
}
