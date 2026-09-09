import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type {
  ChartAccountRecord,
  ChartAccountRepository,
  JournalEntryRecord,
  JournalEntryRepository,
  LedgerPostingRecord,
  LedgerPostingRepository,
} from "../../domain/ports/accounting-unit-of-work";
const DEFAULT_CHART_ACCOUNTS = [
    { code: "trading.cash", kind: "ASSET" },
    { code: "trading.clearing", kind: "ASSET" },
    { code: "trading.pnl", kind: "REVENUE" },
];
function mapChartAccount(row: Record<string, unknown>): ChartAccountRecord {
    return {
        id: String(row.id),
        organizationId: String(row.organization_id),
        code: String(row.code),
        kind: String(row.kind),
        currency: String(row.currency),
        status: String(row.status),
    };
}
function mapJournalEntry(row: Record<string, unknown>): JournalEntryRecord {
    return {
        id: String(row.id),
        organizationId: String(row.organization_id),
        entryKind: String(row.entry_kind),
        status: String(row.status),
        idempotencyKey: String(row.idempotency_key),
        sourceRef: row.source_ref as Record<string, unknown> | null,
        valueDate: String(row.value_date).slice(0, 10),
        executionMode: String(row.execution_mode),
        capitalAccountId: row.capital_account_id ? String(row.capital_account_id) : null,
        portfolioId: row.portfolio_id ? String(row.portfolio_id) : null,
        revision: Number(row.revision),
    };
}
function mapLedgerPosting(row: Record<string, unknown>): LedgerPostingRecord {
    return {
        id: String(row.id),
        journalEntryId: String(row.journal_entry_id),
        organizationId: String(row.organization_id),
        accountCode: String(row.account_code),
        debit: String(row.debit),
        credit: String(row.credit),
        asset: String(row.asset),
        amount: String(row.amount),
    };
}
export function createPgChartAccountRepository(client: PoolClient): ChartAccountRepository {
    return {
        async findByCode(organizationId: string, code: string) {
            const result = await client.query(`SELECT * FROM accounting_chart_accounts WHERE organization_id = $1 AND code = $2`, [organizationId, code]);
            const row = result.rows[0];
            return row ? mapChartAccount(row) : null;
        },
        async ensureDefaultChart(organizationId: string, currency: string) {
            for (const account of DEFAULT_CHART_ACCOUNTS) {
                await client.query(`INSERT INTO accounting_chart_accounts (id, organization_id, code, kind, currency, status)
					 VALUES ($1,$2,$3,$4,$5,'ACTIVE')
					 ON CONFLICT (organization_id, code) DO NOTHING`, [`acc_chart_${randomUUID()}`, organizationId, account.code, account.kind, currency]);
            }
        },
    };
}
export function createPgJournalEntryRepository(client: PoolClient): JournalEntryRepository {
    return {
        async findByIdempotencyKey(organizationId: string, idempotencyKey: string) {
            const result = await client.query(`SELECT * FROM accounting_journal_entries
				 WHERE organization_id = $1 AND idempotency_key = $2`, [organizationId, idempotencyKey]);
            const row = result.rows[0];
            return row ? mapJournalEntry(row) : null;
        },
        async save(record: JournalEntryRecord) {
            await client.query(`INSERT INTO accounting_journal_entries (
				   id, organization_id, entry_kind, status, idempotency_key, source_ref,
				   value_date, execution_mode, capital_account_id, portfolio_id, revision
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [
                record.id,
                record.organizationId,
                record.entryKind,
                record.status,
                record.idempotencyKey,
                record.sourceRef,
                record.valueDate,
                record.executionMode,
                record.capitalAccountId,
                record.portfolioId,
                record.revision,
            ]);
            return record;
        },
    };
}
export function createPgLedgerPostingRepository(client: PoolClient): LedgerPostingRepository {
    return {
        async save(record: LedgerPostingRecord) {
            await client.query(`INSERT INTO accounting_ledger_postings (
				   id, journal_entry_id, organization_id, account_code, debit, credit, asset, amount
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [
                record.id,
                record.journalEntryId,
                record.organizationId,
                record.accountCode,
                record.debit,
                record.credit,
                record.asset,
                record.amount,
            ]);
            return record;
        },
        async findByEntryId(journalEntryId: string) {
            const result = await client.query(`SELECT * FROM accounting_ledger_postings WHERE journal_entry_id = $1 ORDER BY created_at`, [journalEntryId]);
            return result.rows.map(mapLedgerPosting);
        },
    };
}
