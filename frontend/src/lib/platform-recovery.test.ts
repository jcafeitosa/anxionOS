import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	PLATFORM_RECOVERY_PATH,
	platformRecoveryViewFromResponse,
} from "./platform-recovery.ts";

describe("platformRecoveryViewFromResponse", () => {
	it("maps 403 to denied", () => {
		assert.deepEqual(
			platformRecoveryViewFromResponse(403, { recoveryTasks: [] }),
			{ kind: "denied", status: 403 },
		);
	});

	it("maps 200 empty to no_recovery_tasks", () => {
		assert.deepEqual(
			platformRecoveryViewFromResponse(200, { recoveryTasks: [] }),
			{ kind: "empty", reason: "no_recovery_tasks", status: 200 },
		);
	});

	it("does not use agency recovery path", () => {
		assert.equal(PLATFORM_RECOVERY_PATH, "/v1/operations/platform/recovery");
		assert.doesNotMatch(PLATFORM_RECOVERY_PATH, /agencies/);
	});
});
