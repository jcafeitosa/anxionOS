import { z } from "zod";
import {
	executionModeSchema,
	instrumentIdSchema,
	instrumentKindSchema,
	observationKindSchema,
} from "./types";
export const marketDataCommandResultSchema = z.object({
	aggregateId: z.string().min(1),
	revision: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
	instrumentId: instrumentIdSchema.optional(),
	observationHeaderId: z.string().optional(),
});
export const registerInstrumentCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	canonicalSymbol: z.string().min(1).max(64),
	instrumentKind: instrumentKindSchema,
	assetId: z.string().min(1).max(64),
	venueId: z.string().min(1).max(64),
	executionMode: executionModeSchema,
});
export const recordObservationCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	instrumentId: instrumentIdSchema,
	observationKind: observationKindSchema,
	sourceEventId: z.string().uuid(),
	eventTime: z.string().datetime(),
	price: z.string().regex(/^\d+(\.\d+)?$/),
	volume: z
		.string()
		.regex(/^\d+(\.\d+)?$/)
		.optional(),
	executionMode: executionModeSchema,
	qualityFlag: z.enum(["OK", "STALE", "ESTIMATED"]).default("OK"),
});
export const startBackfillCommandSchema = z
	.object({
		commandId: z.string().uuid(),
		organizationId: z.string().uuid(),
		instrumentId: instrumentIdSchema,
		requestedFrom: z.string().datetime(),
		requestedTo: z.string().datetime(),
		executionMode: executionModeSchema,
	})
	.refine((command) => command.requestedFrom < command.requestedTo, {
		message: "requestedTo must be after requestedFrom",
		path: ["requestedTo"],
	});
export const advanceBackfillCursorCommandSchema = z.object({
	commandId: z.string().uuid(),
	jobId: z.string().regex(/^md_bf_[0-9a-f-]{36}$/i),
	organizationId: z.string().uuid(),
	cursorPosition: z.string().optional(),
	rowsIngested: z.number().int().nonnegative(),
	status: z.enum(["RUNNING", "COMPLETED"]),
	lastError: z.string().optional(),
});
export const recordFxRateCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	baseCurrency: z.string().regex(/^[A-Z]{3}$/),
	quoteCurrency: z.string().regex(/^[A-Z]{3}$/),
	rate: z.string().regex(/^\d+(\.\d+)?$/),
	asOf: z.string().datetime(),
	source: z.string().min(1),
});
export const recordCorporateActionCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	instrumentId: z.string().regex(/^md_ins_[0-9a-f-]{36}$/i),
	actionKind: z.enum(["SPLIT", "DIVIDEND", "MERGER", "SPINOFF"]),
	effectiveDate: z.string().datetime().refine(
		(d) => !isNaN(Date.parse(d)),
		"effectiveDate must be a valid ISO date string",
	),
	rawPayload: z.record(z.string(), z.unknown()),
	adjustmentFactor: z.string().regex(/^\d+(\.\d+)?$/).optional(),
	source: z.string().min(1),
});
export const registerVenueCalendarCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	venueId: z.string().min(1).max(64),
	ianaTimezone: z.string().regex(/^[\w]+[\w./-]*$/),
	scope: z.enum(["stocks", "crypto", "both"]),
	is24x7: z.boolean().default(false),
});

export type MarketDataCommandResult = z.infer<
	typeof marketDataCommandResultSchema
>;

export type RegisterInstrumentCommand = z.infer<
	typeof registerInstrumentCommandSchema
>;

export type RecordObservationCommand = z.infer<
	typeof recordObservationCommandSchema
>;

export type StartBackfillCommand = z.infer<typeof startBackfillCommandSchema>;

export type AdvanceBackfillCursorCommand = z.infer<
	typeof advanceBackfillCursorCommandSchema
>;

export type RegisterVenueCalendarCommand = z.infer<
	typeof registerVenueCalendarCommandSchema
>;

export type RecordFxRateCommand = z.infer<typeof recordFxRateCommandSchema>;

export type RecordCorporateActionCommand = z.infer<
	typeof recordCorporateActionCommandSchema
>;
