import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	approveRecoveryTask,
	recoveryMutationOutcomeFromResponse,
	recoveryTaskApproveUrl,
	RECOVERY_TASK_MUTATIONS_CONTRACT,
} from "./operator-recovery-mutations.ts";

const AGENCY_ID = "11111111-1111-4111-8111-111111111111";
const RECOVERY_TASK_ID = "ops_rcv_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const IDEMPOTENCY_KEY = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const commandSuccessBody = {
	aggregateId: RECOVERY_TASK_ID,
	revision: 2,
	recoveryTaskId: RECOVERY_TASK_ID,
};

describe("recoveryTaskApproveUrl", () => {
	it("targets the public approve route", () => {
		assert.equal(
			recoveryTaskApproveUrl(AGENCY_ID, RECOVERY_TASK_ID),
			`/v1/operations/agencies/${AGENCY_ID}/recovery-tasks/${RECOVERY_TASK_ID}/approve`,
		);
		assert.match(RECOVERY_TASK_MUTATIONS_CONTRACT, /Idempotency-Key/);
	});
});

describe("recoveryMutationOutcomeFromResponse", () => {
	it("maps 403 to denied", () => {
		assert.deepEqual(recoveryMutationOutcomeFromResponse(403, { error: {} }), {
			kind: "denied",
			status: 403,
		});
	});

	it("maps 409 to revision_conflict", () => {
		assert.deepEqual(
			recoveryMutationOutcomeFromResponse(409, {
				error: {
					code: "CONFLICT",
					message: "recovery task revision conflict",
					details: { code: "OPS_REVISION_CONFLICT" },
				},
			}),
			{ kind: "revision_conflict", status: 409 },
		);
	});

	it("maps 200 with idempotentReplay to success", () => {
		const outcome = recoveryMutationOutcomeFromResponse(200, {
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

describe("approveRecoveryTask", () => {
	it("happy path sends Idempotency-Key and parses command result", async () => {
		let capturedUrl = "";
		let capturedHeaders: Headers | undefined;
		let capturedBody: unknown;
		const fetchFn: typeof fetch = async (input, init) => {
			capturedUrl = String(input);
			capturedHeaders = new Headers(init?.headers);
			capturedBody = JSON.parse(String(init?.body));
			return new Response(JSON.stringify(commandSuccessBody), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		};

		const outcome = await approveRecoveryTask(
			AGENCY_ID,
			RECOVERY_TASK_ID,
			{ expectedRevision: 1 },
			IDEMPOTENCY_KEY,
			fetchFn,
		);

		assert.equal(
			capturedUrl,
			recoveryTaskApproveUrl(AGENCY_ID, RECOVERY_TASK_ID),
		);
		assert.equal(capturedHeaders?.get("Idempotency-Key"), IDEMPOTENCY_KEY);
		assert.deepEqual(capturedBody, { expectedRevision: 1 });
		assert.equal(outcome.kind, "success");
		if (outcome.kind === "success") {
			assert.equal(outcome.idempotentReplay, false);
			assert.equal(outcome.result.revision, 2);
		}
	});

	it("maps 409 revision conflict without inventing success", async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(
				JSON.stringify({
					error: {
						code: "CONFLICT",
						message: "recovery task revision conflict",
						details: { code: "OPS_REVISION_CONFLICT" },
					},
				}),
				{
					status: 409,
					headers: { "content-type": "application/json" },
				},
			);

		const outcome = await approveRecoveryTask(
			AGENCY_ID,
			RECOVERY_TASK_ID,
			{ expectedRevision: 1 },
			IDEMPOTENCY_KEY,
			fetchFn,
		);
		assert.deepEqual(outcome, { kind: "revision_conflict", status: 409 });
	});

	it("maps 403 denied", async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(JSON.stringify({ error: { code: "FORBIDDEN" } }), {
				status: 403,
				headers: { "content-type": "application/json" },
			});

		const outcome = await approveRecoveryTask(
			AGENCY_ID,
			RECOVERY_TASK_ID,
			{ expectedRevision: 1 },
			IDEMPOTENCY_KEY,
			fetchFn,
		);
		assert.deepEqual(outcome, { kind: "denied", status: 403 });
	});

	it("treats idempotent replay as success", async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(
				JSON.stringify({
					...commandSuccessBody,
					idempotentReplay: true,
				}),
				{
					status: 200,
					headers: { "content-type": "application/json" },
				},
			);

		const outcome = await approveRecoveryTask(
			AGENCY_ID,
			RECOVERY_TASK_ID,
			{ expectedRevision: 1 },
			IDEMPOTENCY_KEY,
			fetchFn,
		);
		assert.equal(outcome.kind, "success");
		if (outcome.kind === "success") {
			assert.equal(outcome.idempotentReplay, true);
		}
	});
});
