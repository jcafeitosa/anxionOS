import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	acquireComputerSession,
	assertSessionTenant,
	assertWorkspacePathReadable,
	buildWorkspacePath,
	createSandboxComputerSessionAdapter,
	executeGovernedToolCall,
	OPENBOT_SANDBOX_WORKSPACE_ROOT,
	releaseComputerSession,
	toolRequiresComputerSession,
} from "@anxionos/agents";
import {
	acquireComputerSessionCommandSchema,
	computerSessionCommandResultSchema,
	OPENBOT_EVENT_TYPES,
	releaseComputerSessionCommandSchema,
} from "@anxionos/contracts/openbot";
import {
	createInMemoryToolAuditPort,
	createInMemoryToolGatewayPort,
} from "./test-support";

const organizationA = "b2000002-0002-4002-8002-000000000002";
const organizationB = "f7000007-0007-4007-8007-000000000007";
const agentA = "c3000003-0003-4003-8003-000000000003";
const agentB = "d4000004-0004-4004-8004-000000000004";

function createDeps() {
	const computerSession = createSandboxComputerSessionAdapter();
	return { computerSession };
}

describe("workspace path jail (ANX-144 S3 / R144-03)", () => {
	test("buildWorkspacePath scopes by organizationId and agentId", () => {
		const path = buildWorkspacePath(organizationA, agentA);
		expect(path).toBe(
			`${OPENBOT_SANDBOX_WORKSPACE_ROOT}/${organizationA}/${agentA}`,
		);
		expect(path).toContain(organizationA);
		expect(path).toContain(agentA);
	});

	test("different organizations produce different workspace paths", () => {
		const pathA = buildWorkspacePath(organizationA, agentA);
		const pathB = buildWorkspacePath(organizationB, agentA);
		expect(pathA).not.toBe(pathB);
	});

	test("different agents in same org produce different workspace paths", () => {
		const pathA = buildWorkspacePath(organizationA, agentA);
		const pathB = buildWorkspacePath(organizationA, agentB);
		expect(pathA).not.toBe(pathB);
	});

	test("assertWorkspacePathReadable allows path inside jail", () => {
		const session = {
			sessionId: randomUUID(),
			organizationId: organizationA,
			agentId: agentA,
			workspacePath: buildWorkspacePath(organizationA, agentA),
			status: "active" as const,
		};
		const target = `${session.workspacePath}/notes.txt`;
		expect(() => assertWorkspacePathReadable(session, target)).not.toThrow();
	});

	test("assertWorkspacePathReadable allows workspace root itself", () => {
		const session = {
			sessionId: randomUUID(),
			organizationId: organizationA,
			agentId: agentA,
			workspacePath: buildWorkspacePath(organizationA, agentA),
			status: "active" as const,
		};
		expect(() =>
			assertWorkspacePathReadable(session, session.workspacePath),
		).not.toThrow();
	});

	test("assertWorkspacePathReadable denies path outside jail", () => {
		const session = {
			sessionId: randomUUID(),
			organizationId: organizationA,
			agentId: agentA,
			workspacePath: buildWorkspacePath(organizationA, agentA),
			status: "active" as const,
		};
		const foreign = buildWorkspacePath(organizationB, agentB);
		expect(() => assertWorkspacePathReadable(session, foreign)).toThrow();
	});

	test("assertWorkspacePathReadable denies traversal outside jail", () => {
		const session = {
			sessionId: randomUUID(),
			organizationId: organizationA,
			agentId: agentA,
			workspacePath: buildWorkspacePath(organizationA, agentA),
			status: "active" as const,
		};
		expect(() =>
			assertWorkspacePathReadable(session, `${session.workspacePath}/../${organizationB}`),
		).toThrow();
	});

	test("assertWorkspacePathReadable denies absolute path outside sandbox root", () => {
		const session = {
			sessionId: randomUUID(),
			organizationId: organizationA,
			agentId: agentA,
			workspacePath: buildWorkspacePath(organizationA, agentA),
			status: "active" as const,
		};
		expect(() => assertWorkspacePathReadable(session, "/etc/passwd")).toThrow();
	});

	test("assertSessionTenant denies cross-tenant session access", () => {
		const session = {
			sessionId: randomUUID(),
			organizationId: organizationA,
			agentId: agentA,
			workspacePath: buildWorkspacePath(organizationA, agentA),
			status: "active" as const,
		};
		expect(() => assertSessionTenant(session, organizationB)).toThrow();
	});
});

describe("acquireComputerSession / releaseComputerSession (ANX-144 S3)", () => {
	test("acquire returns active session with jailed workspace path", async () => {
		const { computerSession } = createDeps();
		const result = await acquireComputerSession({ computerSession }, {
			commandId: randomUUID(),
			organizationId: organizationA,
			agentId: agentA,
		});
		expect(result.session.status).toBe("active");
		expect(result.session.workspacePath).toBe(
			buildWorkspacePath(organizationA, agentA),
		);
	});

	test("acquire is idempotent for same org and agent", async () => {
		const { computerSession } = createDeps();
		const first = await acquireComputerSession({ computerSession }, {
			commandId: randomUUID(),
			organizationId: organizationA,
			agentId: agentA,
		});
		const second = await acquireComputerSession({ computerSession }, {
			commandId: randomUUID(),
			organizationId: organizationA,
			agentId: agentA,
		});
		expect(second.session.sessionId).toBe(first.session.sessionId);
	});

	test("release transitions session to released", async () => {
		const { computerSession } = createDeps();
		const acquired = await acquireComputerSession({ computerSession }, {
			commandId: randomUUID(),
			organizationId: organizationA,
			agentId: agentA,
		});
		const released = await releaseComputerSession({ computerSession }, {
			commandId: randomUUID(),
			sessionId: acquired.session.sessionId,
			organizationId: organizationA,
		});
		expect(released.session.status).toBe("released");
	});

	test("release after release is denied", async () => {
		const { computerSession } = createDeps();
		const acquired = await acquireComputerSession({ computerSession }, {
			commandId: randomUUID(),
			organizationId: organizationA,
			agentId: agentA,
		});
		await releaseComputerSession({ computerSession }, {
			commandId: randomUUID(),
			sessionId: acquired.session.sessionId,
			organizationId: organizationA,
		});
		await expect(
			releaseComputerSession({ computerSession }, {
				commandId: randomUUID(),
				sessionId: acquired.session.sessionId,
				organizationId: organizationA,
			}),
		).rejects.toThrow();
	});

	test("cross-tenant release is denied (adversarial)", async () => {
		const { computerSession } = createDeps();
		const acquired = await acquireComputerSession({ computerSession }, {
			commandId: randomUUID(),
			organizationId: organizationA,
			agentId: agentA,
		});
		await expect(
			releaseComputerSession({ computerSession }, {
				commandId: randomUUID(),
				sessionId: acquired.session.sessionId,
				organizationId: organizationB,
			}),
		).rejects.toThrow();
	});

	test("release unknown session is denied", async () => {
		const { computerSession } = createDeps();
		await expect(
			releaseComputerSession({ computerSession }, {
				commandId: randomUUID(),
				sessionId: randomUUID(),
				organizationId: organizationA,
			}),
		).rejects.toThrow();
	});

	test("acquire after release creates new session", async () => {
		const { computerSession } = createDeps();
		const first = await acquireComputerSession({ computerSession }, {
			commandId: randomUUID(),
			organizationId: organizationA,
			agentId: agentA,
		});
		await releaseComputerSession({ computerSession }, {
			commandId: randomUUID(),
			sessionId: first.session.sessionId,
			organizationId: organizationA,
		});
		const second = await acquireComputerSession({ computerSession }, {
			commandId: randomUUID(),
			organizationId: organizationA,
			agentId: agentA,
		});
		expect(second.session.sessionId).not.toBe(first.session.sessionId);
	});

	test("cross-tenant read via foreign workspace path is denied (adversarial)", () => {
		const sessionA = {
			sessionId: randomUUID(),
			organizationId: organizationA,
			agentId: agentA,
			workspacePath: buildWorkspacePath(organizationA, agentA),
			status: "active" as const,
		};
		const foreignFile = `${buildWorkspacePath(organizationB, agentB)}/secret.txt`;
		expect(() => assertWorkspacePathReadable(sessionA, foreignFile)).toThrow();
	});

	test("publishes acquired event when publishEvents provided", async () => {
		const { computerSession } = createDeps();
		const events: string[] = [];
		await acquireComputerSession(
			{
				computerSession,
				publishEvents: async (published) => {
					for (const event of published) {
						events.push(event.eventType);
					}
				},
			},
			{
				commandId: randomUUID(),
				organizationId: organizationA,
				agentId: agentA,
			},
		);
		expect(events).toContain(OPENBOT_EVENT_TYPES.COMPUTER_SESSION_ACQUIRED);
	});
});

describe("computer session tool policy (ANX-144 S3)", () => {
	test("toolRequiresComputerSession matches sandbox.computer prefix", () => {
		expect(toolRequiresComputerSession("sandbox.computer.read_file")).toBe(true);
		expect(toolRequiresComputerSession("sandbox.health_probe")).toBe(false);
	});

	test("executeGovernedToolCall denies computer tool without session", async () => {
		const toolGateway = createInMemoryToolGatewayPort();
		const toolAudit = createInMemoryToolAuditPort();
		const result = await executeGovernedToolCall(
			{ toolGateway, toolAudit },
			{
				commandId: randomUUID(),
				requestId: randomUUID(),
				organizationId: organizationA,
				agentId: agentA,
				toolName: "sandbox.computer.read_file",
				inputHash: "sha256:read",
			},
		);
		expect(result.decision.decision).toBe("DENY");
		expect(result.decision.ruleId).toBe("openbot.computer.session.required");
	});

	test("executeGovernedToolCall denies computer tool with tenant mismatch", async () => {
		const toolGateway = createInMemoryToolGatewayPort();
		const toolAudit = createInMemoryToolAuditPort();
		const { computerSession } = createDeps();
		const acquired = await acquireComputerSession({ computerSession }, {
			commandId: randomUUID(),
			organizationId: organizationA,
			agentId: agentA,
		});
		const result = await executeGovernedToolCall(
			{
				toolGateway,
				toolAudit,
				computerSession: {
					...acquired.session,
					organizationId: organizationB,
				},
			},
			{
				commandId: randomUUID(),
				requestId: randomUUID(),
				organizationId: organizationA,
				agentId: agentA,
				toolName: "sandbox.computer.read_file",
				inputHash: "sha256:read",
			},
		);
		expect(result.decision.decision).toBe("DENY");
		expect(result.decision.ruleId).toBe("openbot.computer.session.mismatch");
	});

	test("executeGovernedToolCall allows computer tool with active session", async () => {
		const toolGateway = createInMemoryToolGatewayPort();
		const toolAudit = createInMemoryToolAuditPort();
		const { computerSession } = createDeps();
		const acquired = await acquireComputerSession({ computerSession }, {
			commandId: randomUUID(),
			organizationId: organizationA,
			agentId: agentA,
		});
		const result = await executeGovernedToolCall(
			{ toolGateway, toolAudit, computerSession: acquired.session },
			{
				commandId: randomUUID(),
				requestId: randomUUID(),
				organizationId: organizationA,
				agentId: agentA,
				toolName: "sandbox.computer.read_file",
				inputHash: "sha256:read",
			},
		);
		expect(result.decision.decision).toBe("ALLOW");
		expect(result.effect).toBeDefined();
	});
});

describe("openbot S3 command contracts (ANX-144 S3)", () => {
	test("acquireComputerSessionCommandSchema requires uuid fields", () => {
		const parsed = acquireComputerSessionCommandSchema.parse({
			commandId: randomUUID(),
			organizationId: organizationA,
			agentId: agentA,
		});
		expect(parsed.organizationId).toBe(organizationA);
	});

	test("releaseComputerSessionCommandSchema requires sessionId", () => {
		const parsed = releaseComputerSessionCommandSchema.parse({
			commandId: randomUUID(),
			sessionId: randomUUID(),
			organizationId: organizationA,
		});
		expect(parsed.organizationId).toBe(organizationA);
	});

	test("computerSessionCommandResultSchema wraps session ref", async () => {
		const { computerSession } = createDeps();
		const result = await acquireComputerSession({ computerSession }, {
			commandId: randomUUID(),
			organizationId: organizationA,
			agentId: agentA,
		});
		const parsed = computerSessionCommandResultSchema.parse(result);
		expect(parsed.session.status).toBe("active");
	});

	test("OPENBOT_EVENT_TYPES includes computer session lifecycle", () => {
		expect(OPENBOT_EVENT_TYPES.COMPUTER_SESSION_ACQUIRED).toBe(
			"openbot.computer_session.acquired.v1",
		);
		expect(OPENBOT_EVENT_TYPES.COMPUTER_SESSION_RELEASED).toBe(
			"openbot.computer_session.released.v1",
		);
	});
});
