export {
	registerInstrument,
	type RegisterInstrumentDeps,
} from "./application/commands/register-instrument";
export {
	recordObservation,
	type RecordObservationDeps,
} from "./application/commands/record-observation";
export {
	createMarketDataObservedConsumer,
	type ObservedConsumerDeps,
} from "./application/consumers/observed-consumer";
export {
	getPriceAsOf,
	type GetPriceAsOfDeps,
	type GetPriceAsOfInput,
	type GetPriceAsOfResult,
} from "./application/queries/get-price-as-of";
export {
	MarketDataCommandError,
	throwMarketDataError,
} from "./application/errors";
export { ensureMarketDataSchema } from "./infrastructure/migrate";
export { createMarketDataUnitOfWork } from "./infrastructure/market-data-unit-of-work";
export { createPgCommandJournalRepository } from "./infrastructure/persistence/command-journal-repository";
export {
	createPgInstrumentRepository,
	createPgObservationRepository,
} from "./infrastructure/persistence/repositories";
