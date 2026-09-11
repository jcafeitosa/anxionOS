import type { Pool, PoolClient } from "pg";
import type {
	InstrumentRecord,
	InstrumentRepository,
	ObservationHeaderRecord,
	ObservationRepository,
} from "../../domain/ports/market-data-unit-of-work";

type Queryable = Pool | PoolClient;

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
function mapObservationHeader(
	row: Record<string, unknown>,
): ObservationHeaderRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		instrumentId: String(row.instrument_id),
		observationKind: String(row.observation_kind),
		sourceEventId: String(row.source_event_id),
		eventTime: (row.event_time as Date).toISOString(),
		receiveTime: (row.receive_time as Date).toISOString(),
		price: String(row.price),
		volume: row.volume == null ? null : String(row.volume),
		executionMode: String(row.execution_mode),
		qualityFlag: String(row.quality_flag),
	};
}
export function createPgInstrumentRepository(
	client: Queryable,
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
			// ON CONFLICT targets the partial unique index on
			// (organization_id, canonical_symbol, venue_id) WHERE status='ACTIVE'
			// (D-MD-001). The no-op "DO UPDATE SET id = ...id" always makes
			// Postgres return a row via RETURNING, whether newly inserted or a
			// pre-existing ACTIVE row from a concurrent registerInstrument
			// racing past the application-level natural-key check. The caller
			// tells the two cases apart by comparing the returned id against
			// the id it asked to insert.
			const result = await client.query(
				`INSERT INTO market_data_instruments (
					id, organization_id, canonical_symbol, instrument_kind, asset_id, venue_id,
					execution_mode, status, revision
				) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
				ON CONFLICT (organization_id, canonical_symbol, venue_id) WHERE status = 'ACTIVE'
				DO UPDATE SET id = market_data_instruments.id
				RETURNING *`,
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
			return mapInstrument(result.rows[0]);
		},
	};
}
export function createPgObservationRepository(
	client: Queryable,
): ObservationRepository {
	return {
		async findBySourceEventId(organizationId, sourceEventId) {
			const result = await client.query(
				`SELECT * FROM market_data_observation_headers
				 WHERE organization_id = $1 AND source_event_id = $2`,
				[organizationId, sourceEventId],
			);
			const row = result.rows[0];
			return row ? mapObservationHeader(row) : null;
		},
		async findLatestByInstrument(organizationId, instrumentId) {
			const result = await client.query(
				`SELECT * FROM market_data_observation_headers
				 WHERE organization_id = $1 AND instrument_id = $2
				 ORDER BY event_time DESC
				 LIMIT 1`,
				[organizationId, instrumentId],
			);
			const row = result.rows[0];
			return row ? mapObservationHeader(row) : null;
		},
		async saveHeader(record: ObservationHeaderRecord) {
			// ON CONFLICT targets the UNIQUE(organization_id, source_event_id)
			// dedup guard (D-MD-004: "reconexão não duplica"). Same no-op
			// "DO UPDATE" idiom as instruments.save: RETURNING always yields a
			// row, and the caller distinguishes "I inserted it" from "a
			// concurrent recordObservation for the same tick already committed
			// it" by comparing the returned id against the id it asked to
			// insert — without that, a losing racer would either crash on a raw
			// unique_violation or (with a plain INSERT ... ON CONFLICT DO
			// NOTHING) silently return no row at all.
			const result = await client.query(
				`INSERT INTO market_data_observation_headers (
					id, organization_id, instrument_id, observation_kind, source_event_id,
					event_time, receive_time, price, volume, execution_mode, quality_flag
				) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
				ON CONFLICT (organization_id, source_event_id)
				DO UPDATE SET id = market_data_observation_headers.id
				RETURNING *`,
				[
					record.id,
					record.organizationId,
					record.instrumentId,
					record.observationKind,
					record.sourceEventId,
					record.eventTime,
					record.receiveTime,
					record.price,
					record.volume,
					record.executionMode,
					record.qualityFlag,
				],
			);
			return mapObservationHeader(result.rows[0]);
		},
		async insertTimeseries(record: {
			eventTime: string;
			receiveTime: string;
			organizationId: string;
			instrumentId: string;
			observationHeaderId: string;
			observationKind: string;
			price: string;
			volume: string | null;
		}) {
			await client.query(
				`INSERT INTO market_data_observations_ts (
				event_time, receive_time, organization_id, instrument_id, observation_header_id,
				observation_kind, price, volume
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
				[
					record.eventTime,
					record.receiveTime,
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
