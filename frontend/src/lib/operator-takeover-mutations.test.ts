import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AgentCatalogItem } from "./agency-agents-catalog.ts";
import {
	createTakeoverMutationIdempotencyKey,
	executeOperatorTakeover,
	OPERATOR_TAKEOVER_TARGET_LEVEL,
	takeoverAgentEligibleForMutation,
	takeoverConfirmFieldsValid,
	takeoverConfirmSubmitDisabled,
	takeoverMutationOutcomeFromResponse,
	takeoverTransitionUrl,
	TAKEOVER_MUTATION_CONTRACT,
} from "./operator-takeover-mutations.ts";

const AGENCY_ID = "11111111-1111-4111-8111-111111111111";
const AGENT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const APPROVAL_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const IDEMPOTENCY_KEY = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const activeAgent: AgentCatalogItem = {
	id: AGENT_ID,
	organizationId: AGENCY_ID,
	kind: "AGENCY",
	displayName: "Execution desk",
	status: "ACTIVE",
	activeVersionId: null,
	revision: 1,
};

const commandSuccessBody = {
	aggregateId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
	revision: 1,
	authorityEpoch: 2,
};

describe("takeoverTransitionUrl", () => {
	it("targets the governance autonomy transition route", () => {
		assert.equal(
			takeoverTransitionUrl(AGENCY_ID, AGENT_ID),
			`/v1/agencies/${AGENCY_ID}/agents/${AGENT_ID}/autonomy/transition`,
		);
		assert.match(TAKEOVER_MUTATION_CONTRACT, /Idempotency-Key/);
		assert.match(TAKEOVER_MUTATION_CONTRACT, /transitionKind: takeover/);
	});
});

describe("takeoverMutationOutcomeFromResponse", () => {
	it("maps 403 to denied", () => {
		assert.deepEqual(takeoverMutationOutcomeFromResponse(403, { error: {} }), {
			kind: "denied",
			status: 403,
		});
	});

	it("maps 409 GOV_EPOCH_STALE to revision_conflict", () => {
		assert.deepEqual(
			takeoverMutationOutcomeFromResponse(409, {
				error: {
					code: "CONFLICT",
					message: "authority epoch stale",
					details: { code: "GOV_EPOCH_STALE" },
				},
			}),
			{ kind: "revision_conflict", status: 409 },
		);
	});

	it("maps 200 with idempotentReplay to success", () => {
		const outcome = takeoverMutationOutcomeFromResponse(200, {
			...commandSuccessBody,
			idempotentReplay: true,
		});
		assert.equal(outcome.kind, "success");
		if (outcome.kind === "success") {
			assert.equal(outcome.idempotentReplay, true);
			assert.equal(outcome.result.revision, 1);
		}
	});
});

describe("takeoverConfirmFieldsValid", () => {
	it("requires institutional UUID approvalId and non-empty evidenceHash", () => {
		assert.equal(takeoverConfirmFieldsValid(APPROVAL_ID, "sha256:demo"), true);
		assert.equal(takeoverConfirmFieldsValid("not-a-uuid", "sha256:demo"), false);
		assert.equal(takeoverConfirmFieldsValid(APPROVAL_ID, "   "), false);
	});
});

describe("takeoverConfirmSubmitDisabled", () => {
	it("blocks submit while busy or fields invalid", () => {
		assert.equal(
			takeoverConfirmSubmitDisabled({
				busy: true,
				approvalId: APPROVAL_ID,
				evidenceHash: "sha256:demo",
			}),
			true,
		);
		assert.equal(
			takeoverConfirmSubmitDisabled({
				busy: false,
				approvalId: APPROVAL_ID,
				evidenceHash: "sha256:demo",
			}),
			false,
		);
	});
});

describe("takeoverAgentEligibleForMutation", () => {
	it("allows ACTIVE agent with unassigned autonomy", () => {
		assert.deepEqual(
			takeoverAgentEligibleForMutation(activeAgent, { kind: "unassigned" }),
			{ eligible: true },
		);
	});

	it("blocks when agent already at operator takeover target level", () => {
		const result = takeoverAgentEligibleForMutation(activeAgent, {
			kind: "ready",
			level: OPERATOR_TAKEOVER_TARGET_LEVEL,
			assignmentStatus: "active",
			assignmentRevision: 1,
		});
		assert.equal(result.eligible, false);
		if (!result.eligible) {
			assert.match(result.reason, /já em L2/);
		}
	});

	it("blocks when autonomy query is denied", () => {
		const result = takeoverAgentEligibleForMutation(activeAgent, {
			kind: "denied",
			status: 403,
		});
		assert.equal(result.eligible, false);
	});
});

describe("executeOperatorTakeover", () => {
	it("happy path sends Idempotency-Key and takeover body", async () => {
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

		const outcome = await executeOperatorTakeover(
			AGENCY_ID,
			AGENT_ID,
			{
				targetLevel: OPERATOR_TAKEOVER_TARGET_LEVEL,
				transitionKind: "takeover",
				evidenceHash: "sha256:operator-takeover",
				approvalId: APPROVAL_ID,
				reason: "operator emergency",
			},
			IDEMPOTENCY_KEY,
			fetchFn,
		);

		assert.equal(capturedUrl, takeoverTransitionUrl(AGENCY_ID, AGENT_ID));
		assert.equal(capturedHeaders?.get("Idempotency-Key"), IDEMPOTENCY_KEY);
		assert.deepEqual(capturedBody, {
			targetLevel: "L2",
			transitionKind: "takeover",
			evidenceHash: "sha256:operator-takeover",
			approvalId: APPROVAL_ID,
			reason: "operator emergency",
		});
		assert.equal(outcome.kind, "success");
	});

	it("maps network failure to stale without inventing success", async () => {
		const fetchFn: typeof fetch = async () => {
			throw new TypeError("network");
		};
		const outcome = await executeOperatorTakeover(
			AGENCY_ID,
			AGENT_ID,
			{
				targetLevel: OPERATOR_TAKEOVER_TARGET_LEVEL,
				transitionKind: "takeover",
				evidenceHash: "sha256:demo",
				approvalId: APPROVAL_ID,
			},
			IDEMPOTENCY_KEY,
			fetchFn,
		);
		assert.deepEqual(outcome, { kind: "stale", status: null });
	});

	it("createTakeoverMutationIdempotencyKey returns UUID shape", () => {
		const key = createTakeoverMutationIdempotencyKey();
		assert.match(
			key,
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
		);
	});
});
