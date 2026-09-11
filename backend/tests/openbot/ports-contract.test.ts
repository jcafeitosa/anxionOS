import { describe, expect, test } from "bun:test";
import {
	createInMemoryComputerSessionPort,
	createInMemoryToolAuditPort,
	createInMemoryToolGatewayPort,
} from "./test-support";

const organizationId = "b2000002-0002-4002-8002-000000000002";
const agentId = "c3000003-0003-4003-8003-000000000003";
const requestId = "e5000005-0005-4005-8005-000000000005";

describe("openbot port contracts (ANX-144 S1)", () => {
	test("ToolGatewayPort denies listed tools before forward", async () => {
		const gateway = createInMemoryToolGatewayPort({
			denyTools: ["sandbox.echo"],
		});
		const request = {
			requestId,
			organizationId,
			agentId,
			toolName: "sandbox.echo",
			inputHash: "sha256:input",
		};
		const decision = await gateway.authorizeToolCall(request);
		expect(decision.decision).toBe("DENY");
		await expect(gateway.forwardToolCall({ request, decision })).rejects.toThrow();
	});

	test("ToolGatewayPort allows and forwards with outcome hash", async () => {
		const gateway = createInMemoryToolGatewayPort();
		const request = {
			requestId,
			organizationId,
			agentId,
			toolName: "sandbox.health_probe",
			inputHash: "sha256:probe",
		};
		const decision = await gateway.authorizeToolCall(request);
		expect(decision.decision).toBe("ALLOW");
		const effect = await gateway.forwardToolCall({ request, decision });
		expect(effect.outcomeHash).toBe("sha256:sha256:probe");
	});

	test("ComputerSessionPort acquires and releases tenant-scoped session", async () => {
		const computer = createInMemoryComputerSessionPort();
		const session = await computer.acquireSession({ organizationId, agentId });
		expect(session.status).toBe("active");
		const released = await computer.releaseSession({
			sessionId: session.sessionId,
			organizationId,
		});
		expect(released.status).toBe("released");
	});

	test("ToolAuditPort records before then after append-only trail", async () => {
		const audit = createInMemoryToolAuditPort();
		await audit.recordBefore({
			requestId,
			organizationId,
			agentId,
			toolName: "sandbox.echo",
			decision: "ALLOW",
		});
		await audit.recordAfter({
			requestId,
			organizationId,
			agentId,
			toolName: "sandbox.echo",
			outcomeHash: "sha256:sandbox-outcome-v1",
		});
		expect(audit.entries).toHaveLength(2);
		expect(audit.entries[0]?.phase).toBe("before");
		expect(audit.entries[1]?.phase).toBe("after");
	});
});
