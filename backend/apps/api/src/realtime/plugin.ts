import {
	type RealtimeChannel,
	realtimeChannelSchema,
	realtimeWsMessageSchema,
} from "@anxionos/contracts/realtime";
import type { betterAuth } from "better-auth";
import { Elysia } from "elysia";
import { realtimeOpenApi } from "../openapi-operations";
import { resolveRealtimeSession } from "./session-context";
import type { SubscriptionManager } from "./subscription-manager";
import type { StoredRealtimeEvent } from "./types";
import type { SubscriptionHandle } from "./subscription-manager";

const SSE_HEARTBEAT_MS = 30_000;
const POLL_TIMEOUT_MS = 25_000;

export interface RealtimePluginDeps {
	auth: ReturnType<typeof betterAuth>;
	manager: SubscriptionManager;
}

interface RealtimeWsState {
	session?: { userId: string; tenantId: string };
	handle?: SubscriptionHandle | null;
	request: Request;
}

function parseChannelsParam(raw: string | undefined): RealtimeChannel[] {
	if (!raw?.trim()) return [];
	return raw
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean)
		.map((part) => realtimeChannelSchema.parse(part));
}

function formatSse(event: StoredRealtimeEvent): string {
	return `id: ${event.seq}\nevent: ${event.envelope.type}\ndata: ${JSON.stringify(event.envelope)}\n\n`;
}

function waitForEvent(
	register: (notify: (event: StoredRealtimeEvent) => void) => void,
	timeoutMs: number,
): Promise<StoredRealtimeEvent | null> {
	return new Promise((resolve) => {
		let settled = false;
		const timer = setTimeout(() => {
			if (settled) return;
			settled = true;
			resolve(null);
		}, timeoutMs);
		register((event) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve(event);
		});
	});
}

export function createRealtimePlugin(deps: RealtimePluginDeps) {
	return new Elysia({ name: "realtime-gateway", prefix: "/api/realtime" })
		.get(
			"/events",
			async ({ request, set, query }) => {
			const session = await resolveRealtimeSession(deps, request.headers);
			if (!session) {
				set.status = 401;
				return { error: "UNAUTHORIZED" };
			}
			const channels = parseChannelsParam(
				typeof query.channels === "string" ? query.channels : undefined,
			);
			const lastEventId =
				request.headers.get("last-event-id") ??
				(typeof query.lastEventId === "string" ? query.lastEventId : undefined);

			set.headers["content-type"] = "text/event-stream";
			set.headers["cache-control"] = "no-cache";
			set.headers.connection = "keep-alive";

			const stream = new ReadableStream<string>({
				start(controller) {
					let closed = false;
					const close = () => {
						if (closed) return;
						closed = true;
						controller.close();
					};

					let handle: SubscriptionHandle;
					try {
						handle = deps.manager.subscribe(
							session,
							channels,
							(event) => {
								if (closed) return;
								controller.enqueue(formatSse(event));
							},
						);
					} catch {
						set.status = 429;
						controller.enqueue(": quota exceeded\n\n");
						close();
						return;
					}

					for (const replay of handle.replaySince(lastEventId)) {
						controller.enqueue(formatSse(replay));
						handle.ack(replay.seq);
					}

					const heartbeat = setInterval(() => {
						if (closed) return;
						controller.enqueue(": heartbeat\n\n");
					}, SSE_HEARTBEAT_MS);

					request.signal.addEventListener("abort", () => {
						clearInterval(heartbeat);
						handle.close();
						close();
					});
				},
			});

			return stream;
		},
			realtimeOpenApi.sse,
		)
		.get(
			"/poll",
			async ({ request, set, query }) => {
			const session = await resolveRealtimeSession(deps, request.headers);
			if (!session) {
				set.status = 401;
				return { error: "UNAUTHORIZED" };
			}
			const channels = parseChannelsParam(
				typeof query.channels === "string" ? query.channels : undefined,
			);
			const lastEventId =
				request.headers.get("last-event-id") ??
				(typeof query.lastEventId === "string" ? query.lastEventId : undefined);

			try {
				let notify: ((event: StoredRealtimeEvent) => void) | undefined;
				const eventPromise = waitForEvent((resolver) => {
					notify = resolver;
				}, POLL_TIMEOUT_MS);
				const handle = deps.manager.subscribe(session, channels, (event) => {
					notify?.(event);
				});
				for (const replay of handle.replaySince(lastEventId)) {
					handle.close();
					return { event: replay.envelope, seq: replay.seq };
				}
				const event = await eventPromise;
				handle.close();
				if (!event) {
					set.status = 204;
					return null;
				}
				handle.ack(event.seq);
				return { event: event.envelope, seq: event.seq };
			} catch {
				set.status = 429;
				return { error: "REALTIME_CONNECTION_QUOTA_EXCEEDED" };
			}
		},
			realtimeOpenApi.poll,
		)
		.ws("/ws", {
			...realtimeOpenApi.ws,
			async open(ws) {
				const state = ws.data as RealtimeWsState;
				const session = await resolveRealtimeSession(deps, state.request.headers);
				if (!session) {
					ws.close(4401, "unauthorized");
					return;
				}
				state.session = session;
				state.handle = null;
			},
			body: realtimeWsMessageSchema,
			message(ws, message) {
				const state = ws.data as RealtimeWsState;
				const session = state.session;
				if (!session) {
					ws.close(4401, "unauthorized");
					return;
				}
				if (message.op === "ping") {
					ws.send(JSON.stringify({ op: "pong" }));
					return;
				}
				const channels = message.channels ?? [];
				if (message.op === "unsubscribe") {
					state.handle?.close();
					state.handle = null;
					ws.send(JSON.stringify({ op: "unsubscribed", channels }));
					return;
				}
				try {
					state.handle?.close();
					const handle = deps.manager.subscribe(session, channels, (event) => {
						ws.send(
							JSON.stringify({
								op: "event",
								seq: event.seq,
								envelope: event.envelope,
							}),
						);
					});
					state.handle = handle;
					ws.send(
						JSON.stringify({
							op: "subscribed",
							channels: handle.setChannels(channels),
						}),
					);
				} catch {
					ws.close(4429, "quota exceeded");
				}
			},
			close(ws) {
				const state = ws.data as RealtimeWsState;
				state.handle?.close();
			},
		});
}
