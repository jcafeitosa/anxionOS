import type {
	InstrumentRepository,
	ObservationHeaderRecord,
	ObservationRepository,
} from "../../domain/ports/market-data-unit-of-work";
import { throwMarketDataError } from "../errors";

export interface GetPriceAsOfDeps {
	instruments: InstrumentRepository;
	observations: ObservationRepository;
}

export interface GetPriceAsOfInput {
	organizationId: string;
	instrumentId: string;
	/** ISO datetime the caller evaluates freshness against. Defaults to now. */
	asOf?: string;
	/**
	 * Explicit staleness budget in milliseconds (D-MD-005, P-R7-04). There is
	 * no implicit/default policy: a sensitive caller (e.g. risk) must state
	 * its own tolerance rather than rely on a silently reused last-known
	 * price. Must be a finite, non-negative number.
	 */
	maxStalenessMs: number;
}

export type GetPriceAsOfResult =
	| {
			status: "FRESH";
			observation: ObservationHeaderRecord;
			ageMs: number;
	  }
	| {
			status: "FAIL_CLOSED";
			reason: "NO_OBSERVATION";
	  }
	| {
			status: "FAIL_CLOSED";
			reason: "STALE";
			ageMs: number;
			observation: ObservationHeaderRecord;
	  };

/**
 * D-MD-005 / P-R7-04: freshness is explicit and FAIL_CLOSED by default.
 * Staleness is measured against eventTime (when the price actually occurred),
 * not receiveTime (ingestion/pipeline lag) — a feed that arrives late must
 * still be reported stale relative to `asOf`, which is exactly the case
 * receiveTime alone would hide. receiveTime remains on the returned
 * observation for callers that need to distinguish price staleness from
 * ingestion lag (D-MD gap/backpressure diagnostics), but it never drives the
 * FRESH/FAIL_CLOSED disposition itself.
 *
 * This function never fabricates or interpolates a price: no observation
 * recorded yet returns FAIL_CLOSED(NO_OBSERVATION), not null-as-zero or a
 * cross-instrument fallback.
 */
export async function getPriceAsOf(
	deps: GetPriceAsOfDeps,
	input: GetPriceAsOfInput,
): Promise<GetPriceAsOfResult> {
	if (!Number.isFinite(input.maxStalenessMs) || input.maxStalenessMs < 0) {
		throwMarketDataError(
			"MD_INVALID_QUERY_INPUT",
			"maxStalenessMs must be a finite, non-negative number",
		);
	}
	const instrument = await deps.instruments.findById(
		input.instrumentId,
		input.organizationId,
	);
	if (!instrument) {
		throwMarketDataError(
			"MD_INSTRUMENT_NOT_FOUND",
			`Instrument ${input.instrumentId} not found`,
		);
	}
	const asOfMs = input.asOf ? Date.parse(input.asOf) : Date.now();
	if (Number.isNaN(asOfMs)) {
		throwMarketDataError(
			"MD_INVALID_QUERY_INPUT",
			`Invalid asOf datetime: ${input.asOf}`,
		);
	}
	const latest = await deps.observations.findLatestByInstrument(
		input.organizationId,
		input.instrumentId,
	);
	if (!latest) {
		return { status: "FAIL_CLOSED", reason: "NO_OBSERVATION" };
	}
	const ageMs = Math.max(0, asOfMs - Date.parse(latest.eventTime));
	if (ageMs > input.maxStalenessMs) {
		return {
			status: "FAIL_CLOSED",
			reason: "STALE",
			ageMs,
			observation: latest,
		};
	}
	return { status: "FRESH", observation: latest, ageMs };
}
