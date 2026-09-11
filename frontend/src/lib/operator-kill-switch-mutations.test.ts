import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	createKillSwitchMutationIdempotencyKey,
	executeKillSwitchActivate,
	executeKillSwitchRelease,
	killSwitchActivateFieldsValid,
	killSwitchActivateSubmitDisabled,
	killSwitchActivateUrl,
	killSwitchMutationOutcomeFromResponse,
	killSwitchReleaseFieldsValid,
	killSwitchReleaseUrl,
	KILL_SWITCH_MUTATIONS_CONTRACT,
} from "./operator-kill-switch-mutations.ts";

const AGENCY_ID = "11111111-1111-4111-8111-111111111111";
const IDEMPOTENCY_KEY = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const commandSuccessBody = {
	aggregateId: "rk_ksw_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
	revision: 2,
	killSwitchActive: true,
	riskEpoch: 5,
};

describe("killSwitchActivateUrl", () => {
	it("targets the risk activate route", () => {
		assert.equal(
			killSwitchActivateUrl(AGENCY_ID),
			`/v1/risk/agencies/${AGENCY_ID}/kill-switch/activate`,
		);
		assert.equal(
			killSwitchReleaseUrl(AGENCY_ID),
			`/v1/risk/agencies/${AGENCY_ID}/kill-switch/release`,
		);
		assert.match(KILL_SWITCH_MUTATIONS_CONTRACT, /Idempotency-Key/);
	});
});

describe("killSwitchMutationOutcomeFromResponse", () => {
	it("maps 403 to denied", () => {
		assert.deepEqual(killSwitchMutationOutcomeFromResponse(403, { error: {} }), {
			kind: "denied",
			status: 403,
		});
	});

	it("maps 409 RK_PERMIT_STALE to revision_conflict", () => {
		assert.deepEqual(
			killSwitchMutationOutcomeFromResponse(409, {
				error: {
					code: "CONFLICT",
					details: { code: "RK_PERMIT_STALE" },
				},
			}),
			{ kind: "revision_conflict", status: 409 },
		);
	});

	it("maps 200 with idempotentReplay to success", () => {
		const outcome = killSwitchMutationOutcomeFromResponse(200, {
			...commandSuccessBody,
			idempotentReplay: true,
		});
		assert.equal(outcome.kind, "success");
		if (outcome.kind === "success") {
			assert.equal(outcome.idempotentReplay, true);
			assert.equal(outcome.result.revision, 2);
		}
	});
});

describe("killSwitch field validation", () => {
	it("requires non-empty reason and activatedBy for activate", () => {
		assert.equal(
			killSwitchActivateFieldsValid("incident", "operator-001"),
			true,
		);
		assert.equal(killSwitchActivateFieldsValid("", "operator-001"), false);
		assert.equal(
			killSwitchActivateSubmitDisabled({
				busy: false,
				reason: "incident",
				activatedBy: "operator-001",
			}),
			false,
		);
	});

	it("requires non-empty releasedBy for release", () => {
		assert.equal(killSwitchReleaseFieldsValid("operator-001"), true);
		assert.equal(killSwitchReleaseFieldsValid(""), false);
	});
});

describe("executeKillSwitchActivate", () => {
	it("sends POST with Idempotency-Key header", async () => {
		let capturedUrl = "";
		let capturedHeaders: Headers | undefined;
		const fetchFn: typeof fetch = async (input, init) => {
			capturedUrl = String(input);
			capturedHeaders = new Headers(init?.headers);
			return new Response(JSON.stringify(commandSuccessBody), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		};
		const outcome = await executeKillSwitchActivate(
			AGENCY_ID,
			{
				reason: "halt trading",
				activatedBy: "operator-001",
			},
			IDEMPOTENCY_KEY,
			fetchFn,
		);
		assert.equal(capturedUrl, killSwitchActivateUrl(AGENCY_ID));
		assert.equal(capturedHeaders?.get("Idempotency-Key"), IDEMPOTENCY_KEY);
		assert.equal(outcome.kind, "success");
	});

	it("maps network failure to stale", async () => {
		const outcome = await executeKillSwitchRelease(
			AGENCY_ID,
			{ releasedBy: "operator-001" },
			IDEMPOTENCY_KEY,
			async () => {
				throw new Error("offline");
			},
		);
		assert.deepEqual(outcome, { kind: "stale", status: null });
	});
});

describe("createKillSwitchMutationIdempotencyKey", () => {
	it("returns a UUID", () => {
		assert.match(
			createKillSwitchMutationIdempotencyKey(),
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
		);
	});
});
