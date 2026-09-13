import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createPgPool } from "@anxionos/eventing/postgres";
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

const legacyPartnerOrganizationId = "11111111-1111-4111-8111-111111111111";

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
			await client.query(migrationSql);

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
