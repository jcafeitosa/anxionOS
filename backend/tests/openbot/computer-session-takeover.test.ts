import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	acquireComputerSession,
	createSandboxComputerSessionAdapter,
	executeGovernedToolCall,
	releaseComputerSession,
	resumeBotControl,
	takeoverComputerSession,
} from "@anxionos/agents";
import {
	computerSessionTakeoverResultSchema,
	OPENBOT_EVENT_TYPES,
	resumeBotControlCommandSchema,
	takeoverComputerSessionCommandSchema,
} from "@anxionos/contracts/openbot";
import {
	createInMemoryToolAuditPort,
	createInMemoryToolGatewayPort,
} from "./test-support";

const organizationId = "b2000002-0002-4002-8002-000000000002";
const agentId = "c3000003-0003-4003-8003-000000000003";
const operatorId = "a1000001-0001-4001-8001-000000000001";
const operatorB = "d4000004-0004-4004-8004-000000000004";

function createDeps() {
	return { computerSession: createSandboxComputerSessionAdapter() };
}

describe("takeoverComputerSession / resumeBotControl (ANX-144 S5 / R144-05)", () => {
	test("takeover revokes bot authority token and sets human controller", async () => {
		const { computerSession } = createDeps();
		const acquired = await acquireComputerSession(
			{ computerSession },
			{
				commandId: randomUUID(),
				organizationId,
				agentId,
			},
		);
		const botToken = acquired.session.authorityToken;

		const takeover = await takeoverComputerSession(
			{ computerSession },
			{
				commandId: randomUUID(),
				sessionId: acquired.session.sessionId,
				organizationId,
				operatorId,
			},
		);

		expect(takeover.revokedAuthorityToken).toBe(botToken);
		expect(takeover.session.controller).toBe("human");
		expect(takeover.session.authorityToken).not.toBe(botToken);
		expect(computerSession.isAuthorityRevoked(botToken)).toBe(true);
	});

	test("resumeBotControl returns bot controller without new session id", async () => {
		const { computerSession } = createDeps();
		const acquired = await acquireComputerSession(
			{ computerSession },
			{
				commandId: randomUUID(),
				organizationId,
				agentId,
			},
		);
		const takeover = await takeoverComputerSession(
			{ computerSession },
			{
				commandId: randomUUID(),
				sessionId: acquired.session.sessionId,
				organizationId,
				operatorId,
			},
		);
		const humanToken = takeover.session.authorityToken;

		const resumed = await resumeBotControl(
			{ computerSession },
			{
				commandId: randomUUID(),
				sessionId: acquired.session.sessionId,
				organizationId,
			},
		);

		expect(resumed.session.sessionId).toBe(acquired.session.sessionId);
		expect(resumed.session.controller).toBe("bot");
		expect(resumed.session.authorityToken).not.toBe(humanToken);
		expect(computerSession.isAuthorityRevoked(humanToken)).toBe(true);
	});

	test("adversarial: takeover A → resume → takeover B invalidates all prior tokens", async () => {
		const { computerSession } = createDeps();
		const acquired = await acquireComputerSession(
			{ computerSession },
			{
				commandId: randomUUID(),
				organizationId,
				agentId,
			},
		);
		const tokenBotInitial = acquired.session.authorityToken;

		const takeoverA = await takeoverComputerSession(
			{ computerSession },
			{
				commandId: randomUUID(),
				sessionId: acquired.session.sessionId,
				organizationId,
				operatorId,
			},
		);
		const tokenHumanA = takeoverA.session.authorityToken;

		const resumed = await resumeBotControl(
			{ computerSession },
			{
				commandId: randomUUID(),
				sessionId: acquired.session.sessionId,
				organizationId,
			},
		);
		const tokenBotResumed = resumed.session.authorityToken;

		const takeoverB = await takeoverComputerSession(
			{ computerSession },
			{
				commandId: randomUUID(),
				sessionId: acquired.session.sessionId,
				organizationId,
				operatorId: operatorB,
			},
		);
		const tokenHumanB = takeoverB.session.authorityToken;

		expect(tokenHumanA).not.toBe(tokenHumanB);
		expect(tokenBotResumed).not.toBe(tokenHumanB);
		for (const token of [tokenBotInitial, tokenHumanA, tokenBotResumed]) {
			expect(computerSession.isAuthorityRevoked(token)).toBe(true);
		}
		expect(computerSession.isAuthorityRevoked(tokenHumanB)).toBe(false);
	});

	test("double takeover without resume is denied", async () => {
		const { computerSession } = createDeps();
		const acquired = await acquireComputerSession(
			{ computerSession },
			{
				commandId: randomUUID(),
				organizationId,
				agentId,
			},
		);
		await takeoverComputerSession(
			{ computerSession },
			{
				commandId: randomUUID(),
				sessionId: acquired.session.sessionId,
				organizationId,
				operatorId,
			},
		);
		await expect(
			takeoverComputerSession(
				{ computerSession },
				{
					commandId: randomUUID(),
					sessionId: acquired.session.sessionId,
					organizationId,
					operatorId: operatorB,
				},
			),
		).rejects.toThrow();
	});

	test("resume without takeover is denied", async () => {
		const { computerSession } = createDeps();
		const acquired = await acquireComputerSession(
			{ computerSession },
			{
				commandId: randomUUID(),
				organizationId,
				agentId,
			},
		);
		await expect(
			resumeBotControl(
				{ computerSession },
				{
					commandId: randomUUID(),
					sessionId: acquired.session.sessionId,
					organizationId,
				},
			),
		).rejects.toThrow();
	});

	test("publishes takeover and bot-resumed events", async () => {
		const { computerSession } = createDeps();
		const events: string[] = [];
		const publishEvents = async (published: { eventType: string }[]) => {
			for (const event of published) {
				events.push(event.eventType);
			}
		};

		const acquired = await acquireComputerSession(
			{ computerSession },
			{
				commandId: randomUUID(),
				organizationId,
				agentId,
			},
		);
		await takeoverComputerSession(
			{ computerSession, publishEvents },
			{
				commandId: randomUUID(),
				sessionId: acquired.session.sessionId,
				organizationId,
				operatorId,
			},
		);
		await resumeBotControl(
			{ computerSession, publishEvents },
			{
				commandId: randomUUID(),
				sessionId: acquired.session.sessionId,
				organizationId,
			},
		);

		expect(events).toContain(OPENBOT_EVENT_TYPES.COMPUTER_SESSION_TAKEOVER);
		expect(events).toContain(OPENBOT_EVENT_TYPES.COMPUTER_SESSION_BOT_RESUMED);
	});
});

describe("executeGovernedToolCall during takeover (ANX-144 S5)", () => {
	test("denies bot computer tool while human holds takeover", async () => {
		const { computerSession } = createDeps();
		const toolGateway = createInMemoryToolGatewayPort();
		const toolAudit = createInMemoryToolAuditPort();
		const acquired = await acquireComputerSession(
			{ computerSession },
			{
				commandId: randomUUID(),
				organizationId,
				agentId,
			},
		);
		const staleBotSession = acquired.session;
		await takeoverComputerSession(
			{ computerSession },
			{
				commandId: randomUUID(),
				sessionId: acquired.session.sessionId,
				organizationId,
				operatorId,
			},
		);

		const result = await executeGovernedToolCall(
			{
				toolGateway,
				toolAudit,
				computerSession: staleBotSession,
				computerSessionPort: computerSession,
			},
			{
				commandId: randomUUID(),
				requestId: randomUUID(),
				organizationId,
				agentId,
				toolName: "sandbox.computer.read_file",
				inputHash: "sha256:read",
			},
		);

		expect(result.decision.decision).toBe("DENY");
		expect(result.decision.ruleId).toBe("openbot.computer.authority.revoked");
	});

	test("denies bot tool with stale token after resume issues new bot token", async () => {
		const { computerSession } = createDeps();
		const toolGateway = createInMemoryToolGatewayPort();
		const toolAudit = createInMemoryToolAuditPort();
		const acquired = await acquireComputerSession(
			{ computerSession },
			{
				commandId: randomUUID(),
				organizationId,
				agentId,
			},
		);
		const preTakeoverSession = acquired.session;
		await takeoverComputerSession(
			{ computerSession },
			{
				commandId: randomUUID(),
				sessionId: acquired.session.sessionId,
				organizationId,
				operatorId,
			},
		);
		const resumed = await resumeBotControl(
			{ computerSession },
			{
				commandId: randomUUID(),
				sessionId: acquired.session.sessionId,
				organizationId,
			},
		);

		const staleDenied = await executeGovernedToolCall(
			{
				toolGateway,
				toolAudit,
				computerSession: preTakeoverSession,
				computerSessionPort: computerSession,
			},
			{
				commandId: randomUUID(),
				requestId: randomUUID(),
				organizationId,
				agentId,
				toolName: "sandbox.computer.read_file",
				inputHash: "sha256:stale",
			},
		);
		expect(staleDenied.decision.ruleId).toBe(
			"openbot.computer.authority.revoked",
		);

		const allowed = await executeGovernedToolCall(
			{
				toolGateway,
				toolAudit,
				computerSession: resumed.session,
				computerSessionPort: computerSession,
			},
			{
				commandId: randomUUID(),
				requestId: randomUUID(),
				organizationId,
				agentId,
				toolName: "sandbox.computer.read_file",
				inputHash: "sha256:current",
			},
		);
		expect(allowed.decision.decision).toBe("ALLOW");
	});

	test("resume does not duplicate acquire effect (same session id)", async () => {
		const { computerSession } = createDeps();
		const acquired = await acquireComputerSession(
			{ computerSession },
			{
				commandId: randomUUID(),
				organizationId,
				agentId,
			},
		);
		await takeoverComputerSession(
			{ computerSession },
			{
				commandId: randomUUID(),
				sessionId: acquired.session.sessionId,
				organizationId,
				operatorId,
			},
		);
		const resumed = await resumeBotControl(
			{ computerSession },
			{
				commandId: randomUUID(),
				sessionId: acquired.session.sessionId,
				organizationId,
			},
		);
		const secondAcquire = await acquireComputerSession(
			{ computerSession },
			{
				commandId: randomUUID(),
				organizationId,
				agentId,
			},
		);
		expect(secondAcquire.session.sessionId).toBe(acquired.session.sessionId);
		expect(resumed.session.sessionId).toBe(acquired.session.sessionId);
	});
});

describe("openbot S5 command contracts (ANX-144 S5)", () => {
	test("takeoverComputerSessionCommandSchema requires operatorId", () => {
		const parsed = takeoverComputerSessionCommandSchema.parse({
			commandId: randomUUID(),
			sessionId: randomUUID(),
			organizationId,
			operatorId,
		});
		expect(parsed.operatorId).toBe(operatorId);
	});

	test("resumeBotControlCommandSchema validates session scope", () => {
		const parsed = resumeBotControlCommandSchema.parse({
			commandId: randomUUID(),
			sessionId: randomUUID(),
			organizationId,
		});
		expect(parsed.organizationId).toBe(organizationId);
	});

	test("computerSessionTakeoverResultSchema includes revoked token", async () => {
		const { computerSession } = createDeps();
		const acquired = await acquireComputerSession(
			{ computerSession },
			{
				commandId: randomUUID(),
				organizationId,
				agentId,
			},
		);
		const result = await takeoverComputerSession(
			{ computerSession },
			{
				commandId: randomUUID(),
				sessionId: acquired.session.sessionId,
				organizationId,
				operatorId,
			},
		);
		const parsed = computerSessionTakeoverResultSchema.parse(result);
		expect(parsed.previousController).toBe("bot");
		expect(parsed.revokedAuthorityToken).toBe(acquired.session.authorityToken);
	});

	test("OPENBOT_EVENT_TYPES includes takeover lifecycle events", () => {
		expect(OPENBOT_EVENT_TYPES.COMPUTER_SESSION_TAKEOVER).toBe(
			"openbot.computer_session.takeover.v1",
		);
		expect(OPENBOT_EVENT_TYPES.COMPUTER_SESSION_BOT_RESUMED).toBe(
			"openbot.computer_session.bot_resumed.v1",
		);
	});
});
