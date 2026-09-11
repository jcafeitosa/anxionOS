import { describe, expect, test } from "bun:test";
import {
	AGENTS_EVENT_TYPES,
	agentSkillBoundPayloadSchema,
	bindAgentSkillCommandSchema,
	createSkillVersionCommandSchema,
	recordSkillVersionEvaluationCommandSchema,
	registerSkillCommandSchema,
	skillRegisteredPayloadSchema,
	skillVersionCreatedPayloadSchema,
	skillVersionEvaluatedPayloadSchema,
	skillVersionSubmittedPayloadSchema,
	submitSkillVersionCommandSchema,
} from "@anxionos/contracts/agents";

const skillId = "11111111-1111-4111-8111-111111111111";
const skillVersionId = "22222222-2222-4222-8222-222222222222";
const organizationId = "33333333-3333-4333-8333-333333333333";
const agentId = "44444444-4444-4444-8444-444444444444";
const agentVersionId = "55555555-5555-4555-8555-555555555555";
const commandId = "66666666-6666-4666-8666-666666666666";
const evaluationId = "77777777-7777-4777-8777-777777777777";

const contentRef = {
	bucket: "skills",
	key: "org/demo/skill-v1.md",
	contentHash: "sha256:abc",
};

describe("agents skills command contracts (ANX-143 S9)", () => {
	test("registerSkillCommandSchema accepts slug and displayName", () => {
		const parsed = registerSkillCommandSchema.parse({
			commandId,
			slug: "market-analysis",
			displayName: "Market Analysis",
		});
		expect(parsed.slug).toBe("market-analysis");
	});

	test("registerSkillCommandSchema rejects invalid slug", () => {
		const result = registerSkillCommandSchema.safeParse({
			commandId,
			slug: "Market Analysis",
			displayName: "Market Analysis",
		});
		expect(result.success).toBe(false);
	});

	test("createSkillVersionCommandSchema requires content hash", () => {
		const parsed = createSkillVersionCommandSchema.parse({
			commandId,
			skillId,
			schemaVersion: "1.0.0",
			contentRef,
			contentHash: "sha256:deadbeef",
		});
		expect(parsed.contentHash).toBe("sha256:deadbeef");
	});

	test("submitSkillVersionCommandSchema requires expectedRevision", () => {
		const result = submitSkillVersionCommandSchema.safeParse({
			commandId,
			skillId,
			skillVersionId,
		});
		expect(result.success).toBe(false);
	});

	test("recordSkillVersionEvaluationCommandSchema accepts verified outcome", () => {
		const parsed = recordSkillVersionEvaluationCommandSchema.parse({
			commandId,
			skillId,
			skillVersionId,
			expectedRevision: 2,
			outcome: "verified",
			evaluationRef: {
				evaluationId,
				rubricVersion: "rubric-v1",
				outcome: "pass",
				evidenceHash: "sha256:evidence",
			},
		});
		expect(parsed.outcome).toBe("verified");
	});

	test("bindAgentSkillCommandSchema ties agent version to skill version", () => {
		const parsed = bindAgentSkillCommandSchema.parse({
			commandId,
			agentId,
			agentVersionId,
			skillVersionId,
			expectedAgentRevision: 3,
		});
		expect(parsed.skillVersionId).toBe(skillVersionId);
	});
});

describe("agents skills event contracts (ANX-143 S9)", () => {
	test("AGENTS_EVENT_TYPES uses versioned skill event names", () => {
		expect(AGENTS_EVENT_TYPES.SKILL_REGISTERED).toBe(
			"agents.skill.registered.v1",
		);
		expect(AGENTS_EVENT_TYPES.SKILL_VERSION_CREATED).toBe(
			"agents.skill_version.created.v1",
		);
		expect(AGENTS_EVENT_TYPES.AGENT_SKILL_BOUND).toBe(
			"agents.agent_skill.bound.v1",
		);
	});

	test("skillVersionCreatedPayloadSchema defaults sandbox side effects", () => {
		const parsed = skillVersionCreatedPayloadSchema.parse({
			skillId,
			skillVersionId,
			organizationId,
			versionNumber: 1,
			schemaVersion: "1.0.0",
			contentRef,
			contentHash: "sha256:abc",
			status: "draft",
			permissionRequirements: [],
			sandboxPolicy: {},
			revision: 1,
		});
		expect(parsed.sandboxPolicy.allowedSideEffects).toEqual([]);
	});

	test("skillVersionSubmittedPayloadSchema enforces draft to candidate", () => {
		const parsed = skillVersionSubmittedPayloadSchema.parse({
			skillId,
			skillVersionId,
			organizationId,
			versionNumber: 1,
			fromStatus: "draft",
			toStatus: "candidate",
			revision: 2,
		});
		expect(parsed.toStatus).toBe("candidate");
	});

	test("skillVersionEvaluatedPayloadSchema requires evaluationRef", () => {
		const result = skillVersionEvaluatedPayloadSchema.safeParse({
			skillId,
			skillVersionId,
			organizationId,
			versionNumber: 1,
			fromStatus: "candidate",
			toStatus: "verified",
			revision: 3,
		});
		expect(result.success).toBe(false);
	});

	test("agentSkillBoundPayloadSchema accepts binding config", () => {
		const parsed = agentSkillBoundPayloadSchema.parse({
			agentId,
			agentVersionId,
			skillVersionId,
			organizationId,
			bindingConfig: { priority: 1 },
			revision: 4,
		});
		expect(parsed.bindingConfig.priority).toBe(1);
	});

	test("skillRegisteredPayloadSchema accepts organization scope", () => {
		const parsed = skillRegisteredPayloadSchema.parse({
			skillId,
			organizationId,
			slug: "risk-review",
			displayName: "Risk Review",
			revision: 1,
		});
		expect(parsed.slug).toBe("risk-review");
	});
});
