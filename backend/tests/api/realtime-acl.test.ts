import { describe, expect, test } from "bun:test";
import {
	canSubscribeChannel,
	filterAllowedChannels,
} from "../../apps/api/src/realtime/acl";

describe("realtime ACL", () => {
	test("session.revoked only for own user tenant", () => {
		const own = { userId: "u1", tenantId: "u1" };
		const other = { userId: "u1", tenantId: "u2" };
		expect(canSubscribeChannel(own, "session.revoked")).toBe(true);
		expect(canSubscribeChannel(other, "session.revoked")).toBe(false);
		expect(canSubscribeChannel(own, "notifications")).toBe(true);
	});

	test("filterAllowedChannels caps channel count", () => {
		process.env.REALTIME_MAX_CHANNELS_PER_CONNECTION = "2";
		const ctx = { userId: "u1", tenantId: "u1" };
		const channels = filterAllowedChannels(ctx, [
			"health.deps",
			"dashboard.metrics",
			"notifications",
		]);
		expect(channels).toHaveLength(2);
		delete process.env.REALTIME_MAX_CHANNELS_PER_CONNECTION;
	});
});
