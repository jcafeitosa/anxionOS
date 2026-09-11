/** ANX-170 S2 — lag samples for outbox/inbox SLI instrumentation. */

export type EventingLagChannel = "outbox" | "inbox";

export interface EventingLagSample {
	channel: EventingLagChannel;
	/** ISO timestamp of the oldest unprocessed item in the sample group. */
	oldestPendingAt: string;
	pendingCount: number;
	ownerDomain?: string;
	consumerName?: string;
}

export interface EventingLagQueryPort {
	getOutboxLagSamples(): Promise<EventingLagSample[]>;
	/** Inbox lag when consumers expose pending backlog; empty when not tracked. */
	getInboxLagSamples(): Promise<EventingLagSample[]>;
}
