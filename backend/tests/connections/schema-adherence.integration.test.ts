import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	createConnectionsUnitOfWork,
	createPgCommandJournalRepository,
	ensureConnectionsSchema,
} from "@anxionos/connections";
import { createPgPool } from "@anxionos/eventing/postgres";
import {
	getDatabaseUrl,
	shouldRunPgIntegrationTests,
	truncateDomainTables,
} from "../pg-harness-guard";

/**
 * ANX-470 — prova de aderencia codigo<->DDL do modulo connections: as 5 tabelas
 * sao exercitadas pelos repositorios REAIS contra o schema real.
 */
describe("connections schema adherence (ANX-470)", () => {
	test("repositories exercise all connections tables on the real schema", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		const url = getDatabaseUrl();
		if (!url) return;
		const pool = createPgPool(url);
		try {
			await ensureConnectionsSchema(pool);
			await truncateDomainTables(
				pool,
				"TRUNCATE connections_ai_accounts, connections_connection_bindings, connections_inference_requests, connections_usage_records, connections_command_journal RESTART IDENTITY CASCADE",
			);
			const unitOfWork = createConnectionsUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
			const organizationId = randomUUID();
			const aiAccountId = randomUUID();
			const inferenceRequestId = randomUUID();
			const bindingId = randomUUID();

			await unitOfWork.runInTransaction(async (ctx) => {
				await ctx.aiAccounts.save({
					id: aiAccountId,
					organizationId,
					ownerPrincipalId: randomUUID(),
					providerId: "openai",
					displayName: "OpenAI Account",
					status: "ACTIVE",
					revision: 1,
				});
				await ctx.bindings.save({
					id: bindingId,
					connectionId: aiAccountId,
					bindingVersion: 1,
					organizationId,
					aiAccountId,
					kind: "OPENAI",
					environment: "PRODUCTION",
					adapterId: "openai-adapter",
					status: "ACTIVE",
					revision: 1,
					secretId: "secret_id_1",
					secretGeneration: 1,
				});
				await ctx.inferenceRequests.save({
					id: inferenceRequestId,
					organizationId,
					bindingId,
					bindingVersion: 1,
					idempotencyKey: `idem_${randomUUID()}`,
					operation: "chat_completion",
					status: "COMPLETED",
					modelRef: "gpt-4o",
					latencyMs: 123,
				});
				await ctx.usageRecords.save({
					id: randomUUID(),
					organizationId,
					aiAccountId,
					connectionBindingId: bindingId,
					bindingVersion: 1,
					inferenceRequestId,
					consumerKind: "agent",
					consumerPrincipalId: randomUUID(),
					operation: "chat_completion",
					quantity: "10",
					unit: "requests",
				});
				const commandId = randomUUID();
				await ctx.commandJournal.save({
					commandId,
					organizationId,
					commandName: "establishBinding",
					responseSnapshot: { bindingId },
				});
				const replay = await ctx.commandJournal.findByCommandId(commandId);
				expect(replay?.commandName).toBe("establishBinding");
			});
			expect(commandJournal).toBeDefined();
		} finally {
			await pool.end();
		}
	});
});
