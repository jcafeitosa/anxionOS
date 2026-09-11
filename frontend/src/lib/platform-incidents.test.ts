import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	PLATFORM_INCIDENTS_PATH,
	platformIncidentsViewFromResponse,
} from "./platform-incidents.ts";

describe("platformIncidentsViewFromResponse", () => {
	it("maps 403 to denied", () => {
		assert.deepEqual(platformIncidentsViewFromResponse(403, { incidents: [] }), {
			kind: "denied",
			status: 403,
		});
	});

	it("maps 200 empty to no_incidents", () => {
		assert.deepEqual(platformIncidentsViewFromResponse(200, { incidents: [] }), {
			kind: "empty",
			reason: "no_incidents",
			status: 200,
		});
	});

	it("does not use agency collection path", () => {
		assert.equal(PLATFORM_INCIDENTS_PATH, "/v1/operations/platform/incidents");
		assert.doesNotMatch(PLATFORM_INCIDENTS_PATH, /agencies/);
	});
});
