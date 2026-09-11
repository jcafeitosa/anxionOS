import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	createAppendOnlyToolAuditAdapter,
	createGovernanceToolGateway,
	executeGovernedToolCall,
} from "@anxionos/agents";
import {
	OPENBOT_EVENT_TYPES,
	OPENBOT_TOOL_INVOKE_CAPABILITY,
	toolAuditEntrySchema,
} from "@anxionos/contracts/openbot";
import { assignAutonomyLevel } from "@anxionos/governance";
import {
	createInMemoryApprovalRepository,
	createInMemoryAuthorityEpochStore,
	createInMemoryAutonomyAssignmentRepository,
	createInMemoryChangeProposalRepository,
	createInMemoryCommandJournalRepository,
	createInMemoryGrantRepository,
	createRecordingGovernanceUnitOfWork,
} from "../governance/test-support";
import {
	createInMemoryToolAuditPort,
	createInMemoryToolGatewayPort,
} from "./test-support";

const organizationId = "b2000002-0002-4002-8002-000000000002";
const agentId = "c3000003-0003-4003-8003-000000000003";

describe("append-only tool audit adapter (ANX-144 S4)", () => {
	test("listTrail returns ordered before/after entries without mutation", async () => {
		const audit = createAppendOnlyToolAuditAdapter();
		const requestId = randomUUID();
		const before = await audit.recordBefore({
			requestId,
			organizationId,
			agentId,
			toolName: "sandbox.echo",
			decision: "ALLOW",
			ruleId: "sandbox.allow",
		});
		const after = await audit.recordAfter({
			requestId,
			organizationId,
			agentId,
			toolName: "sandbox.echo",
			outcomeHash: "sha256:outcome",
		});

		const trail = await audit.listTrail({ requestId });
		expect(trail).toHaveLength(2);
		expect(trail[0]?.auditId).toBe(before.auditId);
		expect(trail[1]?.auditId).toBe(after.auditId);
		expect(trail[0]?.ruleId).toBe("sandbox.allow");
		expect(Object.isFrozen(trail)).toBe(false);
		expect(audit.entries).toHaveLength(2);
	});

	test("entries are append-only (growing trail, no deletes)", async () => {
		const audit = createAppendOnlyToolAuditAdapter();
		const requestA = randomUUID();
		const requestB = randomUUID();
		await audit.recordBefore({
			requestId: requestA,
			organizationId,
			agentId,
			toolName: "sandbox.echo",
			decision: "DENY",
			ruleId: "sandbox.deny-list",
		});
		await audit.recordBefore({
			requestId: requestB,
			organizationId,
			agentId,
			toolName: "sandbox.health_probe",
			decision: "DENY",
			ruleId: "governance.grant.missing",
		});
		expect(audit.entries).toHaveLength(2);
		expect(await audit.listTrail({ requestId: requestA })).toHaveLength(1);
		expect(await audit.listTrail({ requestId: requestB })).toHaveLength(1);
	});
});

describe("executeGovernedToolCall audit events (ANX-144 S4)", () => {
	function createGovernedDeps() {
		const grantRepository = createInMemoryGrantRepository();
		const autonomyAssignmentRepository =
			createInMemoryAutonomyAssignmentRepository();
		const commandJournal = createInMemoryCommandJournalRepository();
		const { unitOfWork } = createRecordingGovernanceUnitOfWork({
			grantRepository,
			autonomyAssignmentRepository,
			changeProposalRepository: createInMemoryChangeProposalRepository(),
			approvalRepository: createInMemoryApprovalRepository(),
			authorityEpochStore: createInMemoryAuthorityEpochStore(),
			commandJournal,
		});
		const forwarder = createInMemoryToolGatewayPort();
		const toolGateway = createGovernanceToolGateway({
			deps: { autonomyAssignmentRepository, grantRepository },
			forwarder,
		});
		const toolAudit = createInMemoryToolAuditPort();
		const events: string[] = [];
		return {
			governanceDeps: { unitOfWork, commandJournal },
			deps: {
				toolGateway,
				toolAudit,
				publishEvents: async (published: { eventType: string }[]) => {
					for (const event of published) {
						events.push(event.eventType);
					}
				},
			},
			toolAudit,
			events,
		};
	}

	test("denied path emits audit.before + tool_call.denied with ruleId on entry", async () => {
		const setup = createGovernedDeps();
		await assignAutonomyLevel(setup.governanceDeps, {
			commandId: randomUUID(),
			scopeId: organizationId,
			subjectAgentId: agentId,
			level: "L1",
		});
		const requestId = randomUUID();
		await executeGovernedToolCall(setup.deps, {
			commandId: randomUUID(),
			requestId,
			organizationId,
			agentId,
			toolName: "sandbox.health_probe",
			inputHash: "sha256:probe",
		});

		expect(setup.events).toContain(OPENBOT_EVENT_TYPES.AUDIT_BEFORE_RECORDED);
		expect(setup.events).toContain(OPENBOT_EVENT_TYPES.TOOL_CALL_DENIED);
		expect(setup.events).not.toContain(
			OPENBOT_EVENT_TYPES.AUDIT_AFTER_RECORDED,
		);

		const trail = await setup.toolAudit.listTrail({ requestId });
		expect(trail).toHaveLength(1);
		const parsed = toolAuditEntrySchema.parse(trail[0]);
		expect(parsed.phase).toBe("before");
		expect(parsed.decision).toBe("DENY");
		expect(parsed.ruleId).toBe("governance.grant.missing");
	});

	test("allowed path emits audit before/after and forwarded events", async () => {
		const grantRepository = createInMemoryGrantRepository();
		const now = new Date("2026-09-10T12:00:00.000Z");
		await grantRepository.save({
			id: randomUUID(),
			tenantId: organizationId,
			agencyId: organizationId,
			scopeId: organizationId,
			scopeKind: "agency",
			granteePrincipalId: "d4000004-0004-4004-8004-000000000004",
			granteeAgentId: agentId,
			capability: OPENBOT_TOOL_INVOKE_CAPABILITY,
			resourceRef: null,
			status: "active",
			authorityEpochAtIssue: 1,
			revision: 1,
			derivedFromMembershipId: null,
			validFrom: now,
			validUntil: null,
			createdAt: now,
			updatedAt: now,
		});

		const autonomyAssignmentRepository =
			createInMemoryAutonomyAssignmentRepository();
		const commandJournal = createInMemoryCommandJournalRepository();
		const { unitOfWork } = createRecordingGovernanceUnitOfWork({
			grantRepository,
			autonomyAssignmentRepository,
			changeProposalRepository: createInMemoryChangeProposalRepository(),
			approvalRepository: createInMemoryApprovalRepository(),
			authorityEpochStore: createInMemoryAuthorityEpochStore(),
			commandJournal,
		});
		const toolGateway = createGovernanceToolGateway({
			deps: { autonomyAssignmentRepository, grantRepository },
			forwarder: createInMemoryToolGatewayPort(),
		});
		const toolAudit = createInMemoryToolAuditPort();
		const events: string[] = [];
		const setup = {
			governanceDeps: { unitOfWork, commandJournal },
			deps: {
				toolGateway,
				toolAudit,
				publishEvents: async (published: { eventType: string }[]) => {
					for (const event of published) {
						events.push(event.eventType);
					}
				},
			},
			toolAudit,
			events,
		};
		await assignAutonomyLevel(setup.governanceDeps, {
			commandId: randomUUID(),
			scopeId: organizationId,
			subjectAgentId: agentId,
			level: "L1",
		});

		const requestId = randomUUID();
		await executeGovernedToolCall(setup.deps, {
			commandId: randomUUID(),
			requestId,
			organizationId,
			agentId,
			toolName: "sandbox.health_probe",
			inputHash: "sha256:probe",
		});

		expect(setup.events).toContain(OPENBOT_EVENT_TYPES.AUDIT_BEFORE_RECORDED);
		expect(setup.events).toContain(OPENBOT_EVENT_TYPES.AUDIT_AFTER_RECORDED);
		expect(setup.events).toContain(OPENBOT_EVENT_TYPES.TOOL_CALL_FORWARDED);

		const trail = await setup.toolAudit.listTrail({ requestId });
		expect(trail).toHaveLength(2);
		expect(trail[0]?.ruleId).toBe("governance.grant.allowed");
		expect(trail[1]?.outcomeHash).toBe("sha256:sha256:probe");
	});
});
