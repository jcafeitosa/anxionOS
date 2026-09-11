export interface DecisionsConsumerDedupRecord {
	eventId: string;
	consumerName: string;
	organizationId: string;
}

export interface DecisionsConsumerDedupRepository {
	findByEventId(eventId: string): Promise<DecisionsConsumerDedupRecord | null>;
	save(record: DecisionsConsumerDedupRecord): Promise<DecisionsConsumerDedupRecord>;
}
