import type { PoolClient } from "pg";
import type {
	InstrumentRecord,
	InstrumentRepository,
	ObservationHeaderRecord,
	ObservationRepository,
} from "../../domain/ports/market-data-unit-of-work";

function mapInstrument(row: Record<string, unknown>): InstrumentRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		canonicalSymbol: String(row.canonical_symbol),
		instrumentKind: String(row.instrument_kind),
		assetId: String(row.asset_id),
		venueId: String(row.venue_id),
		executionMode: String(row.execution_mode),
		status: String(row.status),
		revision: Number(row.revision),
	};
}
export function createPgInstrumentRepository(
	client: PoolClient,
): InstrumentRepository {
	return {
		async findById(instrumentId, organizationId) {
			const result = await client.query(
				"SELECT * FROM market_data_instruments WHERE id = $1 AND organization_id = $2",
				[instrumentId, organizationId],
			);
			const row = result.rows[0];
			return row ? mapInstrument(row) : null;
		},
		async findActiveByNaturalKey(organizationId, canonicalSymbol, venueId) {
			const result = await client.query(
				`SELECT * FROM market_data_instruments
				 WHERE organization_id = $1 AND canonical_symbol = $2 AND venue_id = $3 AND status = 'ACTIVE'`,
				[organizationId, canonicalSymbol, venueId],
			);
			const row = result.rows[0];
			return row ? mapInstrument(row) : null;
		},
		async save(record: InstrumentRecord) {
			await client.query(
				`INSERT INTO market_data_instruments (
					id, organization_id, canonical_symbol, instrument_kind, asset_id, venue_id,
					execution_mode, status, revision
				) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
				[
					record.id,
					record.organizationId,
					record.canonicalSymbol,
					record.instrumentKind,
					record.assetId,
					record.venueId,
					record.executionMode,
					record.status,
					record.revision,
				],
			);
			return record;
		},
	};
}
export function createPgObservationRepository(
	client: PoolClient,
): ObservationRepository {
	return {
		async findBySourceEventId(organizationId, sourceEventId) {
			const result = await client.query(
				`SELECT * FROM market_data_observation_headers
				 WHERE organization_id = $1 AND source_event_id = $2`,
				[organizationId, sourceEventId],
			);
			const row = result.rows[0];
			if (!row) return null;
			return {
				id: String(row.id),
				organizationId: String(row.organization_id),
				instrumentId: String(row.instrument_id),
				observationKind: String(row.observation_kind),
				sourceEventId: String(row.source_event_id),
				eventTime: (row.event_time as Date).toISOString(),
				price: String(row.price),
				volume: row.volume == null ? null : String(row.volume),
				executionMode: String(row.execution_mode),
				qualityFlag: String(row.quality_flag),
			};
		},
		async saveHeader(record: ObservationHeaderRecord) {
			await client.query(
				`INSERT INTO market_data_observation_headers (
					id, organization_id, instrument_id, observation_kind, source_event_id,
					event_time, price, volume, execution_mode, quality_flag
				) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
				[
					record.id,
					record.organizationId,
					record.instrumentId,
					record.observationKind,
					record.sourceEventId,
					record.eventTime,
					record.price,
					record.volume,
					record.executionMode,
					record.qualityFlag,
				],
			);
			return record;
		},
		async insertTimeseries(record: {
			eventTime: string;
			organizationId: string;
			instrumentId: string;
			observationHeaderId: string;
			observationKind: string;
			price: string;
			volume: string | null;
		}) {
			await client.query(
				`INSERT INTO market_data_observations_ts (
					event_time, organization_id, instrument_id, observation_header_id,
					observation_kind, price, volume
				) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
				[
					record.eventTime,
					record.organizationId,
					record.instrumentId,
					record.observationHeaderId,
					record.observationKind,
					record.price,
					record.volume,
				],
			);
		},
	};
}
