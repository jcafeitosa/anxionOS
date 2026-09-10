import { randomUUID } from "node:crypto";
import type { RealtimeChannel } from "@anxionos/contracts/realtime";
import {
	filterAllowedChannels,
	resolveRealtimeMaxConnectionsPerUser,
	resolveRealtimeMaxPendingEvents,
} from "./acl";
import { buildRealtimeEnvelope, envelopeMatchesChannel } from "./envelope";
import type {
	RealtimeDeliveryHandler,
	RealtimePublishInput,
	RealtimeSessionContext,
	RealtimeSubscriptionSnapshot,
	StoredRealtimeEvent,
} from "./types";

const DEFAULT_RING_SIZE = 1024;
const DEDUPE_WINDOW = 256;

interface InternalSubscription {
	id: string;
	tenantId: string;
	userId: string;
	channels: Set<RealtimeChannel>;
	lastAckSeq: number;
	pending: StoredRealtimeEvent[];
	seenEventIds: string[];
	closed: boolean;
	deliver: RealtimeDeliveryHandler;
}

export interface SubscriptionHandle {
	id: string;
	setChannels(channels: RealtimeChannel[]): RealtimeChannel[];
	ack(seq: number): void;
	close(reason?: string): void;
	replaySince(lastEventId: string | undefined): StoredRealtimeEvent[];
}

export interface SubscriptionManagerOptions {
	ringSize?: number;
}

export class SubscriptionManager {
	private seq = 0;
	private readonly ring: StoredRealtimeEvent[] = [];
	private readonly ringSize: number;
	private readonly subscriptions = new Map<string, InternalSubscription>();
	private readonly byUser = new Map<string, Set<string>>();

	constructor(options: SubscriptionManagerOptions = {}) {
		this.ringSize = options.ringSize ?? DEFAULT_RING_SIZE;
	}

	subscribe(
		ctx: RealtimeSessionContext,
		channels: RealtimeChannel[],
		deliver: RealtimeDeliveryHandler,
	): SubscriptionHandle {
		const userConnections = this.byUser.get(ctx.userId) ?? new Set<string>();
		const maxConnections = resolveRealtimeMaxConnectionsPerUser();
		if (userConnections.size >= maxConnections) {
			throw new Error("REALTIME_CONNECTION_QUOTA_EXCEEDED");
		}

		const allowed = filterAllowedChannels(ctx, channels);
		const id = `sub_${randomUUID()}`;
		const sub: InternalSubscription = {
			id,
			tenantId: ctx.tenantId,
			userId: ctx.userId,
			channels: new Set(allowed),
			lastAckSeq: 0,
			pending: [],
			seenEventIds: [],
			closed: false,
			deliver,
		};
		this.subscriptions.set(id, sub);
		userConnections.add(id);
		this.byUser.set(ctx.userId, userConnections);

		return this.createHandle(sub);
	}

	publish(input: RealtimePublishInput): StoredRealtimeEvent {
		const envelope = buildRealtimeEnvelope(input);
		const stored: StoredRealtimeEvent = {
			seq: ++this.seq,
			envelope,
		};
		this.ring.push(stored);
		if (this.ring.length > this.ringSize) {
			this.ring.shift();
		}
		for (const sub of this.subscriptions.values()) {
			if (sub.closed) continue;
			if (sub.tenantId !== envelope.tenantId) continue;
			if (!sub.channels.has(input.channel)) continue;
			if (!envelopeMatchesChannel(envelope, input.channel)) continue;
			this.enqueue(sub, stored);
		}
		return stored;
	}

	revokeUserStreams(userId: string, reason = "session.revoked"): void {
		const event = this.publish({
			type: "session.revoked",
			channel: "session.revoked",
			tenantId: userId,
			payload: { reason, userId },
		});
		for (const subId of [...(this.byUser.get(userId) ?? [])]) {
			const sub = this.subscriptions.get(subId);
			if (!sub || sub.closed) continue;
			void this.flushPending(sub, event);
			sub.closed = true;
			this.subscriptions.delete(subId);
		}
		this.byUser.delete(userId);
	}

	listSubscriptions(): RealtimeSubscriptionSnapshot[] {
		return [...this.subscriptions.values()].map((sub) => ({
			id: sub.id,
			tenantId: sub.tenantId,
			userId: sub.userId,
			channels: [...sub.channels],
			lastAckSeq: sub.lastAckSeq,
			pendingCount: sub.pending.length,
			closed: sub.closed,
		}));
	}

	replaySince(lastEventId: string | undefined): StoredRealtimeEvent[] {
		if (!lastEventId) return [...this.ring];
		const lastSeq = Number.parseInt(lastEventId, 10);
		if (!Number.isFinite(lastSeq)) return [...this.ring];
		return this.ring.filter((event) => event.seq > lastSeq);
	}

	private createHandle(sub: InternalSubscription): SubscriptionHandle {
		return {
			id: sub.id,
			setChannels: (channels) => {
				const ctx: RealtimeSessionContext = {
					userId: sub.userId,
					tenantId: sub.tenantId,
				};
				const allowed = filterAllowedChannels(ctx, channels);
				sub.channels = new Set(allowed);
				return allowed;
			},
			ack: (seq) => {
				sub.lastAckSeq = Math.max(sub.lastAckSeq, seq);
			},
			close: () => {
				sub.closed = true;
				this.subscriptions.delete(sub.id);
				const userSet = this.byUser.get(sub.userId);
				userSet?.delete(sub.id);
				if (userSet?.size === 0) {
					this.byUser.delete(sub.userId);
				}
			},
			replaySince: (lastEventId) => {
				const events = this.replaySince(lastEventId);
				const ctxChannels = sub.channels;
				return events.filter((event) =>
					[...ctxChannels].some((channel) =>
						envelopeMatchesChannel(event.envelope, channel),
					),
				);
			},
		};
	}

	private enqueue(sub: InternalSubscription, event: StoredRealtimeEvent): void {
		if (sub.closed) return;
		if (this.isDuplicate(sub, event.envelope.eventId)) return;
		const maxPending = resolveRealtimeMaxPendingEvents();
		if (sub.pending.length >= maxPending) {
			sub.closed = true;
			this.subscriptions.delete(sub.id);
			return;
		}
		sub.pending.push(event);
		void this.flushPending(sub);
	}

	private isDuplicate(sub: InternalSubscription, eventId: string): boolean {
		if (sub.seenEventIds.includes(eventId)) return true;
		sub.seenEventIds.push(eventId);
		if (sub.seenEventIds.length > DEDUPE_WINDOW) {
			sub.seenEventIds.splice(0, sub.seenEventIds.length - DEDUPE_WINDOW);
		}
		return false;
	}

	private async flushPending(
		sub: InternalSubscription,
		terminal?: StoredRealtimeEvent,
	): Promise<void> {
		const batch = terminal ? [...sub.pending, terminal] : [...sub.pending];
		sub.pending = [];
		for (const event of batch) {
			if (sub.closed) return;
			if (event.seq <= sub.lastAckSeq) continue;
			try {
				await sub.deliver(event);
				sub.lastAckSeq = event.seq;
			} catch {
				sub.closed = true;
				this.subscriptions.delete(sub.id);
				return;
			}
		}
	}
}
