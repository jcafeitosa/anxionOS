import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { createAuditUnitOfWork, ensureAuditSchema } from "@anxionos/audit";
import { createPgPool } from "@anxionos/eventing/postgres";
import {
	getDatabaseUrl,
	shouldRunPgIntegrationTests,
	truncateDomainTables,
} from "../pg-harness-guard";

/**
 * ANX-470 — prova de aderencia codigo<->DDL do modulo audit: todas as 3
 * tabelas sao exercitadas pelos repositorios REAIS contra o schema real.
 */
describe("audit schema adherence (ANX-470)", () => {
	test("repositories exercise all audit tables on the real schema", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		const url = getDatabaseUrl();
		if (!url) return;
		const pool = createPgPool(url);
		try {
			await ensureAuditSchema(pool);
			await truncateDomainTables(
				pool,
				"TRUNCATE audit_manifests, audit_flight_recorder_entries, audit_command_journal RESTART IDENTITY CASCADE",
			);
			const unitOfWork = createAuditUnitOfWork(pool);

			const organizationId = randomUUID();
			const sourceEventId = randomUUID();
			const occurredAt = new Date().toISOString();

			await unitOfWork.runInTransaction(async (ctx) => {
				const manifest = {
					id: randomUUID(),
					organizationId,
					sourceEventId,
					ownerDomain: "organizations",
					eventType: "agency.created",
					occurredAt,
					payloadHash: "abc123",
					recordedAt: new Date().toISOString(),
				};
				await ctx.manifests.save(manifest);
				const found = await ctx.manifests.findBySourceEventId(sourceEventId);
				expect(found?.organizationId).toBe(organizationId);

				await ctx.flightRecorderEntries.save({
					id: randomUUID(),
					organizationId,
					manifestId: manifest.id,
					sourceEventId,
					ownerDomain: "organizations",
					eventType: "agency.created",
					occurredAt,
					payloadHash: "abc123",
					recordedAt: new Date().toISOString(),
				});

				const commandId = randomUUID();
				await ctx.commandJournal.save({
					commandId,
					organizationId,
					commandName: "recordManifest",
					sourceEventId,
					responseSnapshot: { ok: true },
				});
				const replay =
					await ctx.commandJournal.findBySourceEventId(sourceEventId);
				expect(replay?.commandId).toBe(commandId);
			});
		} finally {
			await pool.end();
		}
	});
});
