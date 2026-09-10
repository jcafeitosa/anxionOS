import { describe, expect, test } from "bun:test";
import { SubscriptionManager } from "../../apps/api/src/realtime/subscription-manager";

const ctx = { userId: "user-1", tenantId: "user-1" };

describe("SubscriptionManager", () => {
	test("publishes only to matching tenant and channel", async () => {
		const manager = new SubscriptionManager();
		const received: number[] = [];
		const handle = manager.subscribe(ctx, ["health.deps"], (event) => {
			received.push(event.seq);
			handle.ack(event.seq);
		});
		const other = manager.publish({
			type: "health.deps.snapshot",
			channel: "health.deps",
			tenantId: "other-user",
			payload: { postgres: "ok" },
		});
		const mine = manager.publish({
			type: "health.deps.snapshot",
			channel: "health.deps",
			tenantId: "user-1",
			payload: { postgres: "ok" },
		});
		await new Promise((r) => setTimeout(r, 10));
		expect(received).toEqual([mine.seq]);
		expect(other.seq).not.toBe(mine.seq);
		handle.close();
	});

	test("deduplicates by eventId on reconnect delivery", async () => {
		const manager = new SubscriptionManager();
		const counts: string[] = [];
		const handle = manager.subscribe(ctx, ["notifications"], (event) => {
			counts.push(event.envelope.eventId);
		});
		const input = {
			type: "notification.test",
			channel: "notifications" as const,
			tenantId: "user-1",
			payload: { ok: true },
			eventId: "evt-fixed-1",
		};
		manager.publish(input);
		manager.publish(input);
		await new Promise((r) => setTimeout(r, 10));
		expect(counts).toEqual(["evt-fixed-1"]);
		handle.close();
	});

	test("replaySince returns events after Last-Event-ID", () => {
		const manager = new SubscriptionManager();
		const first = manager.publish({
			type: "health.deps.snapshot",
			channel: "health.deps",
			tenantId: "user-1",
			payload: {},
		});
		const second = manager.publish({
			type: "health.deps.snapshot",
			channel: "health.deps",
			tenantId: "user-1",
			payload: {},
		});
		const replay = manager.replaySince(String(first.seq));
		expect(replay.map((e) => e.seq)).toEqual([second.seq]);
	});

	test("revokeUserStreams closes active subscriptions", async () => {
		const manager = new SubscriptionManager();
		const handle = manager.subscribe(ctx, ["session.revoked"], () => {});
		manager.revokeUserStreams("user-1");
		expect(manager.listSubscriptions()).toHaveLength(0);
		handle.close();
	});

	test("enforces per-user connection quota", () => {
		const manager = new SubscriptionManager();
		process.env.REALTIME_MAX_CONNECTIONS_PER_USER = "1";
		manager.subscribe(ctx, ["health.deps"], () => {});
		expect(() => manager.subscribe(ctx, ["health.deps"], () => {})).toThrow(
			"REALTIME_CONNECTION_QUOTA_EXCEEDED",
		);
		delete process.env.REALTIME_MAX_CONNECTIONS_PER_USER;
	});
});
