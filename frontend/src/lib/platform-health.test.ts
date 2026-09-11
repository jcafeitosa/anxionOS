import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	PLATFORM_HEALTH_PATH,
	platformHealthViewFromResponse,
} from "./platform-health.ts";

describe("platformHealthViewFromResponse", () => {
	it("maps 403 to denied", () => {
		assert.deepEqual(
			platformHealthViewFromResponse(403, { deps: { postgres: "ok" } }),
			{ kind: "denied", status: 403 },
		);
	});

	it("maps valid snapshot to ready", () => {
		const view = platformHealthViewFromResponse(200, {
			source: "probeHealthDeps",
			checkedAt: "2026-09-11T16:00:00.000Z",
			stale: false,
			deps: { postgres: "ok", nats: "ok", neo4j: "ok" },
		});
		assert.equal(view.kind, "ready");
		if (view.kind === "ready") {
			assert.equal(view.snapshot.source, "probeHealthDeps");
			assert.equal(view.snapshot.deps.postgres, "ok");
		}
	});

	it("uses the platform health path without agencyId", () => {
		assert.equal(PLATFORM_HEALTH_PATH, "/v1/operations/platform/health");
		assert.doesNotMatch(PLATFORM_HEALTH_PATH, /agency/i);
	});
});
