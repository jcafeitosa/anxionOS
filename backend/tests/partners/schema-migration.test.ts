import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createPgPool } from "@anxionos/eventing/postgres";
import {
	createPartnersCommandIntent,
	loadIdempotentCommandResult,
} from "../../modules/partners/src/application/command-support";
import type { CommandJournalRepository } from "../../modules/partners/src/domain/ports/command-journal";
import { shouldRunPgIntegrationTests } from "../pg-harness-guard";

const migrationSql = readFileSync(
	new URL(
		"../../modules/partners/src/infrastructure/migrations/0001_partners_legacy_upgrade.sql",
		import.meta.url,
	),
	"utf8",
);
const baselineSql = readFileSync(
	new URL(
		"../../modules/partners/src/infrastructure/migrations/0000_partners_core.sql",
		import.meta.url,
	),
	"utf8",
);
const payoutLifecycleSql = readFileSync(
	new URL(
		"../../modules/partners/src/infrastructure/migrations/0003_partners_payout_lifecycle.sql",
		import.meta.url,
	),
	"utf8",
);
const secretRemediationSql = readFileSync(
	new URL(
		"../../modules/partners/src/infrastructure/migrations/0004_partners_secret_text_remediation.sql",
		import.meta.url,
	),
	"utf8",
);
const commandJournalRemediationSql = readFileSync(
	new URL(
		"../../modules/partners/src/infrastructure/migrations/0005_partners_command_journal_secret_remediation.sql",
		import.meta.url,
	),
	"utf8",
);

const legacyPartnerOrganizationId = "11111111-1111-4111-8111-111111111111";
const replayCommandId = "00000000-0000-4000-8000-000000000099";

describe("partners schema migration", () => {
	test("upgrades the legacy accrual schema without losing tenant ownership", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		const url = process.env.DATABASE_URL?.trim();
		if (!url) return;

		const pool = createPgPool(url);
		const client = await pool.connect();
		try {
			await client.query("BEGIN");
			await client.query("SET LOCAL search_path = pg_temp, public");
			await client.query(`
				CREATE TEMP TABLE partners_partners (
					id TEXT PRIMARY KEY,
					organization_id UUID NOT NULL,
					referral_code TEXT NOT NULL,
					display_name TEXT NOT NULL,
					commission_rate NUMERIC NOT NULL,
					referred_organization_id UUID NOT NULL,
					status TEXT NOT NULL,
					revision INTEGER NOT NULL DEFAULT 1,
					created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
					updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
				)
			`);
			await client.query(`
				CREATE TEMP TABLE partners_commission_accruals (
					id TEXT PRIMARY KEY,
					partner_id TEXT NOT NULL,
					organization_id UUID NOT NULL,
					referral_id TEXT,
					referred_organization_id UUID NOT NULL,
					invoice_id TEXT NOT NULL,
					invoice_total_amount NUMERIC NOT NULL,
					commission_rate NUMERIC NOT NULL,
					commission_amount NUMERIC NOT NULL,
					accrued_at TIMESTAMPTZ NOT NULL,
					created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
				)
			`);
			await client.query(
				`INSERT INTO partners_commission_accruals (
					id, partner_id, organization_id, referred_organization_id,
					invoice_id, invoice_total_amount, commission_rate, commission_amount,
					accrued_at
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
				[
					"ptr_acc_legacy",
					"ptr_legacy",
					legacyPartnerOrganizationId,
					"22222222-2222-4222-8222-222222222222",
					"bil_legacy",
					"100.00",
					"10.00",
					"10.00",
				],
			);

			// The baseline must also succeed when the module journal is absent;
			// this is the production path for the legacy database that exposed the
			// 42703 startup failure.
			await client.query(baselineSql);
			const replayIntent = createPartnersCommandIntent("registerPartner", {
				organizationId: legacyPartnerOrganizationId,
				referralCode: "campaign_ghp_legacy_token",
				displayName: "Legacy Partner",
				commissionRate: "10.00",
				referredOrganizationId: "22222222-2222-4222-8222-222222222222",
			});
			await client.query(
				`INSERT INTO partners_command_journal (
					organization_id, command_id, command_name, request_hash, response_snapshot
				) VALUES ($1, $2, $3, $4, $5::jsonb)`,
				[
					legacyPartnerOrganizationId,
					replayCommandId,
					"registerPartner",
					replayIntent.requestHash,
					JSON.stringify({
						aggregateId: "ptr_prt_00000000-0000-4000-8000-000000000099",
						revision: 1,
						partnerId: "ptr_prt_00000000-0000-4000-8000-000000000099",
						referralId: "campaign_ghp_legacy_token",
					}),
				],
			);
			await client.query(
				`INSERT INTO partners_partners (
					id, organization_id, referral_code, display_name,
					commission_rate, referred_organization_id, status
				) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
				[
					"ptr_legacy",
					legacyPartnerOrganizationId,
					"campaign_akia1234567890123456",
					"Acme_ghp_legacy_token",
					"10.00",
					"22222222-2222-4222-8222-222222222222",
					"ACTIVE",
				],
			);
			await client.query(migrationSql);
			await client.query(payoutLifecycleSql);
			await client.query(
				`INSERT INTO partners_payouts (
					id, partner_id, partner_organization_id, requested_amount, status,
					requested_at, approval_reference, failure_reason,
					provider_reference, reversal_reference
				) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9)`,
				[
					"ptr_pay_legacy",
					"ptr_legacy",
					legacyPartnerOrganizationId,
					"10.00",
					"FAILED",
					"provider_ghp_legacy_token",
					"provider_ghp_legacy_token",
					"provider_ghp_legacy_token",
					"legacy_ghp_legacy_token",
				],
			);
			await client.query(secretRemediationSql);
			await client.query(commandJournalRemediationSql);

			const commandJournal: CommandJournalRepository = {
				async findByCommandId(organizationId, commandId) {
					const result = await client.query<{
						organization_id: string;
						command_id: string;
						command_name: string;
						request_hash: string | null;
						response_snapshot: Record<string, unknown>;
					}>(
						`SELECT organization_id, command_id, command_name, request_hash,
								response_snapshot
						 FROM partners_command_journal
						 WHERE organization_id = $1 AND command_id = $2`,
						[organizationId, commandId],
					);
					const row = result.rows[0];
					return row
						? {
								organizationId: row.organization_id,
								commandId: row.command_id,
								commandName: row.command_name,
								requestHash: row.request_hash,
								responseSnapshot: row.response_snapshot,
							}
						: null;
				},
				async findByInvoiceId() {
					return null;
				},
				async save() {},
			};
			const replay = await loadIdempotentCommandResult(
				commandJournal,
				legacyPartnerOrganizationId,
				replayCommandId,
				replayIntent,
			);
			expect(replay).toMatchObject({
				referralId: `[REDACTED:${replayCommandId}]`,
				idempotentReplay: true,
			});

			const sanitizedPartner = await client.query<{
				referral_code: string;
				display_name: string;
			}>(
				`SELECT referral_code, display_name
				 FROM partners_partners WHERE id = 'ptr_legacy'`,
			);
			expect(sanitizedPartner.rows[0]).toEqual({
				referral_code: "[REDACTED:ptr_legacy]",
				display_name: "[REDACTED]",
			});

			const sanitizedPayout = await client.query<{
				approval_reference: string;
				failure_reason: string;
				provider_reference: string;
				reversal_reference: string;
			}>(
				`SELECT approval_reference, failure_reason, provider_reference,
						reversal_reference
				 FROM partners_payouts WHERE id = 'ptr_pay_legacy'`,
			);
			expect(sanitizedPayout.rows[0]).toEqual({
				approval_reference: "[REDACTED]",
				failure_reason: "[REDACTED]",
				provider_reference: "[REDACTED]",
				reversal_reference: "[REDACTED]",
			});

			const upgraded = await client.query<{
				partner_organization_id: string;
				status: string;
				reversed_at: Date | null;
				updated_at: Date;
			}>(
				`SELECT partner_organization_id, status, reversed_at, updated_at
				 FROM partners_commission_accruals`,
			);
			expect(upgraded.rows).toHaveLength(1);
			expect(upgraded.rows[0]).toMatchObject({
				partner_organization_id: legacyPartnerOrganizationId,
				status: "ACCRUED",
				reversed_at: null,
			});
			expect(upgraded.rows[0]?.updated_at).toBeInstanceOf(Date);

			const payouts = await client.query(
				`SELECT partner_organization_id, status, requested_amount
				 FROM partners_payouts LIMIT 0`,
			);
			expect(payouts.fields.map((field) => field.name)).toEqual([
				"partner_organization_id",
				"status",
				"requested_amount",
			]);
		} finally {
			await client.query("ROLLBACK");
			client.release();
			await pool.end();
		}
	});
});
