import { describe, expect, test } from "bun:test";
import { createAgentRegistryAdapter } from "@anxionos/agents";
import type { AgentRegistryPort } from "../../modules/orchestration/src/domain/ports/agent-registry";
import { createInMemoryAgentRepository } from "./test-support";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const agentId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("createAgentRegistryAdapter (G3-AGT-04)", () => {
	test("satisfies orchestration AgentRegistryPort and reports active READY agent", async () => {
		const agentRepository = createInMemoryAgentRepository([
			{
				id: agentId,
				organizationId,
				agencyId: organizationId,
				kind: "AGENCY",
				displayName: "Registry Probe",
				status: "READY",
				activeVersionId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
				revision: 2,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		]);
		const registry: AgentRegistryPort = createAgentRegistryAdapter({
			agentRepository,
		});
		expect(await registry.isAgentActive(agentId, organizationId)).toBe(true);
	});

	test("returns false for wrong tenant or missing active version", async () => {
		const agentRepository = createInMemoryAgentRepository([
			{
				id: agentId,
				organizationId,
				kind: "PLATFORM",
				displayName: "Draft Only",
				status: "DRAFT",
				revision: 1,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		]);
		const registry = createAgentRegistryAdapter({ agentRepository });
		expect(await registry.isAgentActive(agentId, organizationId)).toBe(false);
		expect(
			await registry.isAgentActive(
				agentId,
				"99999999-9999-4999-8999-999999999999",
			),
		).toBe(false);
	});
});
