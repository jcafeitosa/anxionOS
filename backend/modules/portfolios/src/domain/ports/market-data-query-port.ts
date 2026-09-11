export interface PriceAsOfRef {
	observationId: string;
	instrumentId: string;
	price: string;
	eventTime: string;
	qualityFlag: string;
}

export interface FxAsOfRef {
	observationId: string;
	baseCurrency: string;
	quoteCurrency: string;
	rate: string;
	asOf: string;
}

export interface MarketDataQueryPort {
	getPriceAsOf(input: {
		organizationId: string;
		instrumentId: string;
		asOf: string;
		maxStalenessMs: number;
	}): Promise<PriceAsOfRef>;

	getFxAsOf(input: {
		baseCurrency: string;
		quoteCurrency: string;
		asOf: string;
		maxStalenessMs: number;
	}): Promise<FxAsOfRef>;
}
