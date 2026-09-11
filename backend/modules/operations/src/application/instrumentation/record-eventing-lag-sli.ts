import type { MetricsCollector } from "@anxionos/observability";
import {
	DEFAULT_EVENTING_LAG_THRESHOLDS,
	computeLagMs,
	evaluateEventingLagSli,
	lagStatusToAlertSeverity,
	type EventingLagAlert,
	type EventingLagSliThresholds,
} from "../../domain/instrumentation/eventing-lag-sli";
import type {
	EventingLagQueryPort,
	EventingLagSample,
} from "../../domain/ports/eventing-lag-query";

const EVENTING_LAG_METRIC = "operations.eventing.lag";
const EVENTING_LAG_ALERT_METRIC = "operations.eventing.lag.alerts";

export interface LagAlertHook {
	onLagAlert(alert: EventingLagAlert): void;
}

export interface RecordEventingLagSliDeps {
	lagQuery: EventingLagQueryPort;
	metrics: MetricsCollector;
	alertHooks?: LagAlertHook[];
	now: () => string;
	thresholds?: EventingLagSliThresholds;
}

export interface RecordedEventingLagSample {
	channel: EventingLagSample["channel"];
	lagMs: number;
	status: ReturnType<typeof evaluateEventingLagSli>;
	pendingCount: number;
	ownerDomain?: string;
	consumerName?: string;
}

export interface RecordEventingLagSliResult {
	recordedAt: string;
	samples: RecordedEventingLagSample[];
	alerts: EventingLagAlert[];
}

function metricTags(sample: EventingLagSample): Record<string, string> {
	const tags: Record<string, string> = { channel: sample.channel };
	if (sample.ownerDomain) tags.owner_domain = sample.ownerDomain;
	if (sample.consumerName) tags.consumer = sample.consumerName;
	return tags;
}

function recordSample(
	deps: RecordEventingLagSliDeps,
	sample: EventingLagSample,
): { recorded: RecordedEventingLagSample; alert: EventingLagAlert | null } {
	const thresholds = deps.thresholds ?? DEFAULT_EVENTING_LAG_THRESHOLDS;
	const nowIso = deps.now();
	const lagMs = computeLagMs(sample.oldestPendingAt, nowIso);
	const status = evaluateEventingLagSli(lagMs, thresholds);
	const tags = metricTags(sample);

	deps.metrics.recordHistogram(EVENTING_LAG_METRIC, lagMs, tags);

	const severity = lagStatusToAlertSeverity(status);
	let alert: EventingLagAlert | null = null;
	if (severity) {
		alert = {
			channel: sample.channel,
			lagMs,
			severity,
			pendingCount: sample.pendingCount,
			ownerDomain: sample.ownerDomain,
			consumerName: sample.consumerName,
		};
		deps.metrics.incrementCounter(EVENTING_LAG_ALERT_METRIC, {
			...tags,
			severity,
		});
		for (const hook of deps.alertHooks ?? []) {
			hook.onLagAlert(alert);
		}
	}

	return {
		recorded: {
			channel: sample.channel,
			lagMs,
			status,
			pendingCount: sample.pendingCount,
			ownerDomain: sample.ownerDomain,
			consumerName: sample.consumerName,
		},
		alert,
	};
}

/** Samples outbox/inbox lag, records SLI histograms, and fires alert hooks on breach. */
export async function recordEventingLagSli(
	deps: RecordEventingLagSliDeps,
): Promise<RecordEventingLagSliResult> {
	const outbox = await deps.lagQuery.getOutboxLagSamples();
	const inbox = await deps.lagQuery.getInboxLagSamples();
	const samples = [...outbox, ...inbox];

	const recorded: RecordedEventingLagSample[] = [];
	const alerts: EventingLagAlert[] = [];

	for (const sample of samples) {
		const result = recordSample(deps, sample);
		recorded.push(result.recorded);
		if (result.alert) alerts.push(result.alert);
	}

	return {
		recordedAt: deps.now(),
		samples: recorded,
		alerts,
	};
}
