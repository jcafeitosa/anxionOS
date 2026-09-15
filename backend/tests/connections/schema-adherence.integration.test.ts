import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	createConnectionsUnitOfWork,
	createPgCommandJournalRepository,
	ensureConnectionsSchema,
} from "@anxionos/connections";
import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import { invokeInference } from "../../modules/connections/src/application/commands/invoke-inference";
import { registerAIAccount } from "../../modules/connections/src/application/commands/register-ai-account";
import type { InferencePort } from "../../modules/connections/src/domain/ports/inference-port";
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
			await ensureEventingSchema(pool);
			await ensureConnectionsSchema(pool);
			await truncateDomainTables(
				pool,
				"TRUNCATE connections_ai_accounts, connections_connection_bindings, connections_inference_requests, connections_usage_records, connections_command_journal RESTART IDENTITY CASCADE",
			);
			await pool.query(
				"TRUNCATE domain_journal, outbox RESTART IDENTITY CASCADE",
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
					requestHash: "sha256:connections-schema-test",
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
					requestHash: "sha256:connections-schema-test",
					responseSnapshot: { bindingId },
				});
				const replay = await ctx.commandJournal.findByCommandId(
					organizationId,
					commandId,
				);
				expect(replay?.commandName).toBe("establishBinding");
			});
			expect(commandJournal).toBeDefined();
		} finally {
			await pool.end();
		}
	});

	test("idempotency locks serialize concurrent simulated inference and account registration", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		const url = getDatabaseUrl();
		if (!url) return;

		const pool = createPgPool(url);
		try {
			await ensureEventingSchema(pool);
			await ensureConnectionsSchema(pool);
			await truncateDomainTables(
				pool,
				"TRUNCATE connections_ai_accounts, connections_connection_bindings, connections_inference_requests, connections_usage_records, connections_command_journal RESTART IDENTITY CASCADE",
			);
			await pool.query(
				"TRUNCATE domain_journal, outbox RESTART IDENTITY CASCADE",
			);

			const organizationId = randomUUID();
			const ownerPrincipalId = randomUUID();
			const consumerPrincipalId = randomUUID();
			const aiAccountId = `cx_acct_${randomUUID()}`;
			const bindingId = `cx_bind_${randomUUID()}`;
			const unitOfWork = createConnectionsUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);

			await unitOfWork.runInTransaction(async (ctx) => {
				await ctx.aiAccounts.save({
					id: aiAccountId,
					organizationId,
					ownerPrincipalId,
					providerId: "simulated",
					displayName: "Concurrent account",
					status: "active",
					revision: 1,
				});
				await ctx.bindings.save({
					id: bindingId,
					connectionId: aiAccountId,
					bindingVersion: 1,
					organizationId,
					aiAccountId,
					kind: "MODEL",
					environment: "SIMULATED",
					adapterId: "simulated",
					status: "active",
					revision: 1,
					secretId: "simulated-secret",
					secretGeneration: 1,
				});
			});

			let providerCalls = 0;
			const inferencePort: InferencePort = {
				async invoke() {
					providerCalls += 1;
					await new Promise((resolve) => setTimeout(resolve, 10));
					return {
						disposition: "completed",
						modelRef: "simulated/model-v1",
						output: { mode: "SIMULATED" },
						latencyMs: 1,
						quantity: 1,
						unit: "request",
					};
				},
			};
			const idempotencyKey = randomUUID();
			const baseInferenceCommand = {
				bindingId,
				bindingVersion: 1,
				operation: "summarize",
				requirements: {
					schemaVersion: "1.0.0" as const,
					taskType: "concurrency-test",
					operation: "summarize",
					requiredCapabilities: ["text"],
					requiredPurpose: "ROUTINE" as const,
					dataClass: "INTERNAL" as const,
					latencyClass: "INTERACTIVE" as const,
					complexity: "SMALL" as const,
				},
				typedInput: { value: "same-intent" },
				deadline: new Date(Date.now() + 60_000).toISOString(),
				idempotencyKey,
			};
			const inferenceResults = await Promise.all(
				Array.from({ length: 6 }, () =>
					invokeInference(
						{
							unitOfWork,
							inferencePort,
							organizationId,
							consumerPrincipalId,
						},
						{ ...baseInferenceCommand, commandId: randomUUID() },
					),
				),
			);
			expect(providerCalls).toBe(1);
			expect(
				inferenceResults.filter((result) => result.idempotentReplay),
			).toHaveLength(5);
			expect(
				(
					await pool.query(
						"SELECT count(*)::int AS count FROM connections_inference_requests WHERE organization_id = $1 AND idempotency_key = $2",
						[organizationId, idempotencyKey],
					)
				).rows[0]?.count,
			).toBe(1);
			expect(
				(
					await pool.query(
						"SELECT count(*)::int AS count FROM connections_usage_records WHERE organization_id = $1",
						[organizationId],
					)
				).rows[0]?.count,
			).toBe(1);

			const commandId = randomUUID();
			const accountCommand = {
				commandId,
				organizationId,
				ownerPrincipalId,
				providerId: "simulated",
				displayName: "Concurrent draft",
				scopes: ["inference"],
			};
			const accountResults = await Promise.all(
				Array.from({ length: 4 }, () =>
					registerAIAccount({ unitOfWork, commandJournal }, accountCommand),
				),
			);
			expect(
				new Set(accountResults.map((result) => result.aggregateId)).size,
			).toBe(1);
			expect(
				accountResults.filter((result) => result.idempotentReplay),
			).toHaveLength(3);
			expect(
				(
					await pool.query(
						"SELECT count(*)::int AS count FROM connections_ai_accounts WHERE organization_id = $1 AND display_name = $2",
						[organizationId, accountCommand.displayName],
					)
				).rows[0]?.count,
			).toBe(1);
			expect(
				(
					await pool.query(
						"SELECT count(*)::int AS count FROM connections_command_journal WHERE organization_id = $1 AND command_id = $2",
						[organizationId, commandId],
					)
				).rows[0]?.count,
			).toBe(1);
		} finally {
			await pool.end();
		}
	});
});
