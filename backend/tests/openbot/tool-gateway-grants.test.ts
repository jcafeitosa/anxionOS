import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	createGovernanceToolGateway,
	executeGovernedToolCall,
} from "@anxionos/agents";
import { OPENBOT_TOOL_INVOKE_CAPABILITY } from "@anxionos/contracts/openbot";
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

function createGovernedDeps(grantRepository = createInMemoryGrantRepository()) {
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
	return {
		autonomyAssignmentRepository,
		grantRepository,
		governanceDeps: { unitOfWork, commandJournal },
		deps: { toolGateway, toolAudit },
		toolAudit,
	};
}

async function seedAutonomyL1(
	governanceDeps: ReturnType<typeof createGovernedDeps>["governanceDeps"],
) {
	await assignAutonomyLevel(governanceDeps, {
		commandId: randomUUID(),
		scopeId: organizationId,
		subjectAgentId: agentId,
		level: "L1",
	});
}

describe("executeGovernedToolCall with governance grants (ANX-144 S2)", () => {
	test("denies without grant and records before audit with ruleId", async () => {
		const setup = createGovernedDeps();
		await seedAutonomyL1(setup.governanceDeps);

		const requestId = randomUUID();
		const result = await executeGovernedToolCall(setup.deps, {
			commandId: randomUUID(),
			requestId,
			organizationId,
			agentId,
			toolName: "sandbox.health_probe",
			inputHash: "sha256:probe",
		});

		expect(result.decision.decision).toBe("DENY");
		expect(result.decision.ruleId).toBe("governance.grant.missing");
		expect(result.effect).toBeUndefined();
		expect(setup.toolAudit.entries).toHaveLength(1);
		expect(setup.toolAudit.entries[0]?.phase).toBe("before");
		expect(setup.toolAudit.entries[0]?.decision).toBe("DENY");
		expect(setup.toolAudit.entries[0]?.ruleId).toBe("governance.grant.missing");
	});

	test("forwards with grant and records before/after audit trail", async () => {
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
			issuedByPrincipalId: null,
			validFrom: now,
			validUntil: null,
			createdAt: now,
			updatedAt: now,
		});

		const setup = createGovernedDeps(grantRepository);
		await seedAutonomyL1(setup.governanceDeps);

		const requestId = randomUUID();
		const result = await executeGovernedToolCall(setup.deps, {
			commandId: randomUUID(),
			requestId,
			organizationId,
			agentId,
			toolName: "sandbox.health_probe",
			inputHash: "sha256:probe",
		});

		expect(result.decision.decision).toBe("ALLOW");
		expect(result.decision.ruleId).toBe("governance.grant.allowed");
		expect(result.effect?.outcomeHash).toBe("sha256:sha256:probe");
		expect(setup.toolAudit.entries).toHaveLength(2);
		expect(setup.toolAudit.entries[0]?.phase).toBe("before");
		expect(setup.toolAudit.entries[0]?.decision).toBe("ALLOW");
		expect(setup.toolAudit.entries[0]?.ruleId).toBe("governance.grant.allowed");
		expect(setup.toolAudit.entries[1]?.phase).toBe("after");
		expect(setup.toolAudit.entries[1]?.outcomeHash).toBe("sha256:sha256:probe");
	});
});
