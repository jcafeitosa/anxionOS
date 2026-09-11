import {
	createPgFxRateRepository,
	createPgInstrumentRepository,
	createPgObservationRepository,
	getPriceAsOf,
} from "@anxionos/market-data";
import type { Pool } from "pg";
import type {
	FxAsOfRef,
	MarketDataQueryPort,
	PriceAsOfRef,
} from "../../domain/ports/market-data-query-port";
import { throwPortfoliosError } from "../../application/errors";

export function createPgMarketDataQueryAdapter(pool: Pool): MarketDataQueryPort {
	const instruments = createPgInstrumentRepository(pool);
	const observations = createPgObservationRepository(pool);
	const fxRates = createPgFxRateRepository(pool);

	return {
		async getPriceAsOf(input): Promise<PriceAsOfRef> {
			const result = await getPriceAsOf(
				{ instruments, observations },
				{
					organizationId: input.organizationId,
					instrumentId: input.instrumentId,
					asOf: input.asOf,
					maxStalenessMs: input.maxStalenessMs,
				},
			);
			if (result.status === "FAIL_CLOSED" && result.reason === "STALE") {
				throwPortfoliosError(
					"PF_VALUATION_STALE",
					`stale price for instrument ${input.instrumentId}`,
				);
			}
			if (result.status === "FAIL_CLOSED") {
				throwPortfoliosError(
					"PF_INVALID_PRICE_REF",
					`no price observation for instrument ${input.instrumentId}`,
				);
			}
			return {
				observationId: result.observation.id,
				instrumentId: input.instrumentId,
				price: result.observation.price,
				eventTime: result.observation.eventTime,
				qualityFlag: result.observation.qualityFlag,
			};
		},

		async getFxAsOf(input): Promise<FxAsOfRef> {
			if (input.baseCurrency === input.quoteCurrency) {
				return {
					observationId: `fx_identity_${input.baseCurrency}`,
					baseCurrency: input.baseCurrency,
					quoteCurrency: input.quoteCurrency,
					rate: "1",
					asOf: input.asOf,
				};
			}
			const latest = await fxRates.findLatestAsOf(
				input.baseCurrency,
				input.quoteCurrency,
				input.asOf,
			);
			if (!latest) {
				throwPortfoliosError(
					"PF_INVALID_PRICE_REF",
					`missing FX rate ${input.baseCurrency}/${input.quoteCurrency}`,
				);
			}
			const asOfMs = Date.parse(input.asOf);
			const fxAsOfMs = Date.parse(latest.as_of);
			const ageMs = Math.max(0, asOfMs - fxAsOfMs);
			if (ageMs > input.maxStalenessMs) {
				throwPortfoliosError(
					"PF_VALUATION_STALE",
					`stale FX rate ${input.baseCurrency}/${input.quoteCurrency}`,
				);
			}
			return {
				observationId: latest.id,
				baseCurrency: latest.base_currency,
				quoteCurrency: latest.quote_currency,
				rate: latest.rate,
				asOf: latest.as_of,
			};
		},
	};
}
