import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import {
	createPartnersUnitOfWork,
	registerPartner,
} from "../../modules/partners/src";
import { ensurePartnersSchema } from "../../modules/partners/src/infrastructure/migrate";
import { createPgCommandJournalRepository } from "../../modules/partners/src/infrastructure/persistence/command-journal-repository";
import {
	shouldRunPgIntegrationTests,
	truncateDomainTables,
} from "../pg-harness-guard";

const PARTNERS_TABLES =
	"TRUNCATE partners_command_journal, partners_payouts, partners_commission_accruals, partners_partners, domain_journal, outbox CASCADE";

describe("partners command intent against real PostgreSQL", () => {
	test("same commandId is independent per organization and divergent replay conflicts", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		const url = process.env.DATABASE_URL?.trim();
		if (!url) return;
		const pool = createPgPool(url);
		try {
			await ensureEventingSchema(pool);
			await ensurePartnersSchema(pool);
			await truncateDomainTables(pool, PARTNERS_TABLES);
			const unitOfWork = createPartnersUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
			const organizationA = randomUUID();
			const organizationB = randomUUID();
			const referredA = randomUUID();
			const referredB = randomUUID();
			const commandId = randomUUID();
			const makeInput = (
				organizationId: string,
				referredOrganizationId: string,
			) => ({
				commandId,
				organizationId,
				referralCode: `REF-${randomUUID()}`,
				displayName: "Partner",
				commissionRate: "10",
				referredOrganizationId,
			});

			const first = await registerPartner(
				{ unitOfWork, commandJournal },
				makeInput(organizationA, referredA),
			);
			const second = await registerPartner(
				{ unitOfWork, commandJournal },
				makeInput(organizationB, referredB),
			);
			expect(second.partnerId).not.toBe(first.partnerId);
			expect(second.idempotentReplay).not.toBe(true);
			const journalRows = await pool.query(
				"SELECT request_hash FROM partners_command_journal WHERE organization_id = $1 AND command_id = $2",
				[organizationA, commandId],
			);
			expect(journalRows.rows[0]?.request_hash).toMatch(/^[a-f0-9]{64}$/);

			await expect(
				registerPartner(
					{ unitOfWork, commandJournal },
					{
						...makeInput(organizationA, referredA),
						commandId,
						referralCode: `REF-DIVERGENT-${randomUUID()}`,
					},
				),
			).rejects.toMatchObject({ partnersCode: "PTR_IDEMPOTENCY_CONFLICT" });
		} finally {
			await pool.end();
		}
	});

	test("concurrent reuse of one commandId creates one partner and replays", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		const url = process.env.DATABASE_URL?.trim();
		if (!url) return;
		const pool = createPgPool(url);
		try {
			const unitOfWork = createPartnersUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
			const organizationId = randomUUID();
			const referredOrganizationId = randomUUID();
			const input = {
				commandId: randomUUID(),
				organizationId,
				referralCode: `REF-CONCURRENT-${randomUUID()}`,
				displayName: "Concurrent Partner",
				commissionRate: "10",
				referredOrganizationId,
			};
			const [first, second] = await Promise.all([
				registerPartner({ unitOfWork, commandJournal }, input),
				registerPartner({ unitOfWork, commandJournal }, input),
			]);
			expect(first.partnerId).toBe(second.partnerId);
			expect([first.idempotentReplay, second.idempotentReplay]).toContain(true);
			const rows = await pool.query(
				"SELECT count(*)::int AS count FROM partners_partners WHERE organization_id = $1 AND referral_code = $2",
				[organizationId, input.referralCode],
			);
			expect(rows.rows[0]?.count).toBe(1);
		} finally {
			await pool.end();
		}
	});
});
