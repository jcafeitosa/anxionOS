import { resolveSequenceRejectAnomalies } from "../../domain/realtime-ingest-limits";
import type { BackpressureRejectReason } from "./backpressure-handler";
import { RealtimeIngestBackpressureHandler } from "./backpressure-handler";
import type { ReconnectSkipReason } from "./reconnect-handler";
import { RealtimeIngestReconnectHandler } from "./reconnect-handler";
import type { SequenceAnomalyReason } from "./sequence-guard";
import {
	RealtimeIngestSequenceGuard,
	type SequenceQualityFlag,
} from "./sequence-guard";

export interface RealtimeIngestGateDeps {
	backpressure: RealtimeIngestBackpressureHandler;
	reconnect: RealtimeIngestReconnectHandler;
	sequence: RealtimeIngestSequenceGuard;
}

export type RealtimeIngestRejectReason =
	| BackpressureRejectReason
	| SequenceAnomalyReason;

export type RealtimeIngestGateDecision =
	| { action: "proceed"; qualityFlag: SequenceQualityFlag }
	| { action: "skip"; reason: ReconnectSkipReason }
	| { action: "reject"; reason: RealtimeIngestRejectReason };

export interface RealtimeIngestGateInput {
	organizationId: string;
	streamId: string;
	eventId: string;
	sourceEventId: string;
	eventTime: string;
	streamSequence?: number;
}

/**
 * Session gate for observed realtime ingest (ANX-329 S3c/S3d).
 * Order: reconnect → sequence → backpressure.
 */
export function evaluateRealtimeIngestGate(
	deps: RealtimeIngestGateDeps,
	input: RealtimeIngestGateInput,
): RealtimeIngestGateDecision {
	const reconnect = deps.reconnect.admitEvent(
		input.organizationId,
		input.streamId,
		{
			eventId: input.eventId,
			sourceEventId: input.sourceEventId,
		},
	);
	if (reconnect.action === "skip") {
		if (reconnect.reason === "DUPLICATE_SOURCE_EVENT_ID") {
			return { action: "proceed", qualityFlag: "OK" };
		}
		return { action: "skip", reason: reconnect.reason };
	}
	const sequence = deps.sequence.admitEvent(
		input.organizationId,
		input.streamId,
		{
			eventTime: input.eventTime,
			streamSequence: input.streamSequence,
		},
	);
	if (sequence.action === "reject") {
		return { action: "reject", reason: sequence.reason };
	}
	const backpressure = deps.backpressure.admitEvent(
		input.organizationId,
		input.streamId,
	);
	if (backpressure.action === "reject") {
		return { action: "reject", reason: backpressure.reason };
	}
	return { action: "proceed", qualityFlag: sequence.qualityFlag };
}

export function createDefaultRealtimeIngestGate(): RealtimeIngestGateDeps {
	return {
		backpressure: new RealtimeIngestBackpressureHandler(),
		reconnect: new RealtimeIngestReconnectHandler(),
		sequence: new RealtimeIngestSequenceGuard({
			rejectAnomalies: resolveSequenceRejectAnomalies(),
		}),
	};
}

export function markRealtimeStreamDisconnected(
	deps: RealtimeIngestGateDeps,
	organizationId: string,
	streamId: string,
): void {
	deps.reconnect.markDisconnected(organizationId, streamId);
	deps.sequence.markDisconnected(organizationId, streamId);
}

export function onRealtimeStreamReconnect(
	deps: RealtimeIngestGateDeps,
	organizationId: string,
	streamId: string,
): { connectionGeneration: number } {
	deps.sequence.onReconnect(organizationId, streamId);
	return deps.reconnect.onReconnect(organizationId, streamId);
}
