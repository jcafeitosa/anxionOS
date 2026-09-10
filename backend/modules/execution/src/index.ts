export {
	openExecutionSession,
	type OpenExecutionSessionDeps,
} from "./application/commands/open-execution-session";
export {
	submitOrder,
	type SubmitOrderDeps,
} from "./application/commands/submit-order";
export {
	ExecutionCommandError,
	throwExecutionError,
} from "./application/errors";
export { ensureExecutionSchema } from "./infrastructure/migrate";
export { createExecutionUnitOfWork } from "./infrastructure/execution-unit-of-work";
export { createPgCommandJournalRepository } from "./infrastructure/persistence/command-journal-repository";
export { createPgRiskPermitValidationPort } from "./infrastructure/risk-permit-validation";
export {
	SimulatedVenueAdapter,
	type SimulatedVenueAdapterOptions,
} from "./infrastructure/adapters/simulated-venue-adapter";
