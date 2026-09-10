import type {
	RealtimeChannel,
	RealtimeEnvelope,
} from "@anxionos/contracts/realtime";

export interface RealtimeSessionContext {
	userId: string;
	tenantId: string;
}

export interface StoredRealtimeEvent {
	seq: number;
	envelope: RealtimeEnvelope;
}

export interface RealtimeSubscriptionSnapshot {
	id: string;
	tenantId: string;
	userId: string;
	channels: RealtimeChannel[];
	lastAckSeq: number;
	pendingCount: number;
	closed: boolean;
}

export interface RealtimePublishInput {
	type: string;
	channel: RealtimeChannel;
	tenantId: string;
	payload: unknown;
	checkpoint?: string;
	projectionGeneration?: number;
	stale?: boolean;
	eventId?: string;
}

export type RealtimeDeliveryHandler = (
	event: StoredRealtimeEvent,
) => void | Promise<void>;
