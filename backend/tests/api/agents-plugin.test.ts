import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";
import { createAgentsPlugin } from "../../apps/api/src/agents/plugin";
import {
	createInMemoryAgentRepository,
	createInMemoryAgentVersionRepository,
	createInMemoryCommandJournalRepository,
	createRecordingAgentsUnitOfWork,
} from "../agents/test-support";

const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const authUserId = "auth-user-1";
const principalId = "33333333-3333-4333-8333-333333333333";

function createPlugin(options: { authenticated: boolean }) {
	const agentRepository = createInMemoryAgentRepository();
	const { unitOfWork } = createRecordingAgentsUnitOfWork({
		agentRepository,
		agentVersionRepository: createInMemoryAgentVersionRepository(),
		commandJournal: createInMemoryCommandJournalRepository(),
	});
	return createAgentsPlugin({
		auth: {
			api: {
				getSession: async () =>
					options.authenticated ? { user: { id: authUserId } } : null,
			},
		} as never,
		agentRepository,
		agentVersionRepository: createInMemoryAgentVersionRepository(),
		skillRepository: {} as never,
		skillVersionRepository: {} as never,
		agentSkillBindingRepository: {} as never,
		commandJournal: createInMemoryCommandJournalRepository(),
		unitOfWork,
		membershipRepository: {} as never,
		scopedPool: {
			withContext: async (
				_context: unknown,
				work: (client: object) => Promise<unknown>,
			) => work({ query: async () => ({ rows: [] }) }),
		} as never,
		identityRepository: {
			findByAuthUserId: async () => ({
				id: principalId,
				authUserId,
				email: "owner@example.com",
				status: "active",
				revision: 1,
				createdAt: new Date(),
				updatedAt: new Date(),
			}),
		} as never,
	});
}

describe("agents API collection route", () => {
	test("requires a session before reading the collection", async () => {
		const app = new Elysia().use(
			createPlugin({ authenticated: false }) as never,
		);
		const response = await app.handle(
			new Request(`http://127.0.0.1/v1/agencies/${agencyId}/agents`),
		);

		expect(response.status).toBe(401);
	});

	test("rejects an authenticated principal without agency membership", async () => {
		const app = new Elysia().use(
			createPlugin({ authenticated: true }) as never,
		);
		const response = await app.handle(
			new Request(`http://127.0.0.1/v1/agencies/${agencyId}/agents`, {
				headers: { "x-test-auth": authUserId },
			}),
		);

		expect(response.status).toBe(403);
	});
});
