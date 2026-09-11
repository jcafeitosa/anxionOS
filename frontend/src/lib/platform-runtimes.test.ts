import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	PLATFORM_RUNTIMES_PATH,
	platformRuntimesViewFromResponse,
} from "./platform-runtimes.ts";

describe("platformRuntimesViewFromResponse", () => {
	it("maps 403 to denied", () => {
		assert.deepEqual(platformRuntimesViewFromResponse(403, { runtimes: [] }), {
			kind: "denied",
			status: 403,
		});
	});

	it("maps 200 empty to no_runtimes", () => {
		assert.deepEqual(platformRuntimesViewFromResponse(200, { runtimes: [] }), {
			kind: "empty",
			reason: "no_runtimes",
			status: 200,
		});
	});

	it("does not use agency collection path", () => {
		assert.equal(PLATFORM_RUNTIMES_PATH, "/v1/operations/platform/runtimes");
		assert.doesNotMatch(PLATFORM_RUNTIMES_PATH, /agencies/);
	});
});
