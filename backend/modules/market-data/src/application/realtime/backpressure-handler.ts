import {
	resolveBackpressureWindowMs,
	resolveMaxEventsPerStreamPerWindow,
	resolveMaxStreamsPerTenant,
} from "../../domain/realtime-ingest-limits";

export type BackpressureRejectReason =
	| "TENANT_STREAM_QUOTA_EXCEEDED"
	| "STREAM_EVENT_QUOTA_EXCEEDED";

export type BackpressureDecision =
	| { action: "allow" }
	| { action: "reject"; reason: BackpressureRejectReason };

interface StreamWindow {
	windowStartedAt: number;
	eventCount: number;
}

interface TenantState {
	streams: Set<string>;
	windows: Map<string, StreamWindow>;
}

export interface RealtimeIngestBackpressureHandlerOptions {
	now?: () => number;
	maxStreamsPerTenant?: number;
	maxEventsPerStreamPerWindow?: number;
	windowMs?: number;
}

/**
 * In-memory guard for realtime ingest floods (G5-MD-03 / ANX-329 S3a).
 * Enforces per-tenant stream cardinality and per-stream event rate inside a window.
 */
export class RealtimeIngestBackpressureHandler {
	private readonly now: () => number;
	private readonly maxStreamsPerTenant: number;
	private readonly maxEventsPerStreamPerWindow: number;
	private readonly windowMs: number;
	private readonly tenants = new Map<string, TenantState>();

	constructor(options: RealtimeIngestBackpressureHandlerOptions = {}) {
		this.now = options.now ?? (() => Date.now());
		this.maxStreamsPerTenant =
			options.maxStreamsPerTenant ?? resolveMaxStreamsPerTenant();
		this.maxEventsPerStreamPerWindow =
			options.maxEventsPerStreamPerWindow ??
			resolveMaxEventsPerStreamPerWindow();
		this.windowMs = options.windowMs ?? resolveBackpressureWindowMs();
	}

	registerStream(tenantId: string, streamId: string): BackpressureDecision {
		const tenant = this.ensureTenant(tenantId);
		if (tenant.streams.has(streamId)) {
			return { action: "allow" };
		}
		if (tenant.streams.size >= this.maxStreamsPerTenant) {
			return { action: "reject", reason: "TENANT_STREAM_QUOTA_EXCEEDED" };
		}
		tenant.streams.add(streamId);
		tenant.windows.set(streamId, this.freshWindow());
		return { action: "allow" };
	}

	releaseStream(tenantId: string, streamId: string): void {
		const tenant = this.tenants.get(tenantId);
		if (!tenant) return;
		tenant.streams.delete(streamId);
		tenant.windows.delete(streamId);
		if (tenant.streams.size === 0) {
			this.tenants.delete(tenantId);
		}
	}

	admitEvent(tenantId: string, streamId: string): BackpressureDecision {
		const register = this.registerStream(tenantId, streamId);
		if (register.action === "reject") {
			return register;
		}
		const tenant = this.ensureTenant(tenantId);
		const window = this.currentWindow(tenant, streamId);
		if (window.eventCount >= this.maxEventsPerStreamPerWindow) {
			return { action: "reject", reason: "STREAM_EVENT_QUOTA_EXCEEDED" };
		}
		window.eventCount += 1;
		return { action: "allow" };
	}

	snapshot(tenantId: string): {
		streamCount: number;
		pendingEventsByStream: Record<string, number>;
	} {
		const tenant = this.tenants.get(tenantId);
		if (!tenant) {
			return { streamCount: 0, pendingEventsByStream: {} };
		}
		const pendingEventsByStream: Record<string, number> = {};
		for (const [streamId, window] of tenant.windows) {
			pendingEventsByStream[streamId] = window.eventCount;
		}
		return {
			streamCount: tenant.streams.size,
			pendingEventsByStream,
		};
	}

	private ensureTenant(tenantId: string): TenantState {
		let tenant = this.tenants.get(tenantId);
		if (!tenant) {
			tenant = { streams: new Set(), windows: new Map() };
			this.tenants.set(tenantId, tenant);
		}
		return tenant;
	}

	private freshWindow(): StreamWindow {
		return { windowStartedAt: this.now(), eventCount: 0 };
	}

	private currentWindow(tenant: TenantState, streamId: string): StreamWindow {
		let window = tenant.windows.get(streamId);
		if (!window) {
			window = this.freshWindow();
			tenant.windows.set(streamId, window);
		}
		const elapsed = this.now() - window.windowStartedAt;
		if (elapsed >= this.windowMs) {
			window.windowStartedAt = this.now();
			window.eventCount = 0;
		}
		return window;
	}
}
