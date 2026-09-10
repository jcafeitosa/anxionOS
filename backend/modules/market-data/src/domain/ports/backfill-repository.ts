/**
 * Status machine for a backfill job (ANX-146 slice A):
 *
 *   PENDING --advance--> RUNNING --advance(completed)--> COMPLETED
 *      \                    |
 *       \--advance(completed)--> COMPLETED
 *
 * PAUSED/FAILED are terminal-for-advancement states reached by out-of-scope
 * operational tooling (pause/retry), not by advanceBackfillCursor itself;
 * advanceBackfillCursor only ever writes RUNNING or COMPLETED (D-MD-146-A).
 */
export type BackfillJobStatus =
	| "PENDING"
	| "RUNNING"
	| "PAUSED"
	| "COMPLETED"
	| "FAILED";

/** Statuses a job can still be advanced from (D-MD-146-A). */
export const ADVANCEABLE_BACKFILL_JOB_STATUSES: readonly BackfillJobStatus[] =
	["PENDING", "RUNNING"];

/** Statuses that count as "an active backfill is already in flight". */
export const ACTIVE_BACKFILL_JOB_STATUSES: readonly BackfillJobStatus[] = [
	"PENDING",
	"RUNNING",
	"PAUSED",
];

export interface BackfillJobRecord {
	id: string;
	organizationId: string;
	instrumentId: string;
	/** ISO datetime: inclusive start of the requested historical window. */
	requestedFrom: string;
	/** ISO datetime: exclusive end of the requested historical window. */
	requestedTo: string;
	/**
	 * Opaque resume token for the upstream source's pagination (e.g. a page
	 * token or last-seen event id). Never interpreted or ordered by
	 * market-data itself — only the source adapter that produced it knows how
	 * to resume from it. null before the first page has been ingested.
	 */
	cursorPosition: string | null;
	status: BackfillJobStatus;
	lastError: string | null;
	rowsIngested: number;
	createdAt: string;
	updatedAt: string;
}

export interface BackfillJobRepository {
	findById(
		jobId: string,
		organizationId: string,
	): Promise<BackfillJobRecord | null>;
	/**
	 * The most recently created job still in an active state
	 * (ACTIVE_BACKFILL_JOB_STATUSES) for this instrument, regardless of its
	 * requested window. Used by startBackfill to enforce "one in-flight
	 * backfill per instrument at a time" (D-MD-146-A) — a second window can
	 * only be requested once the active one reaches COMPLETED/FAILED.
	 */
	findActiveByInstrument(
		organizationId: string,
		instrumentId: string,
	): Promise<BackfillJobRecord | null>;
	/**
	 * Idempotent create keyed by the natural key
	 * (organizationId, instrumentId, requestedFrom, requestedTo): a second
	 * `save` for the same natural key — including two genuinely concurrent
	 * callers racing at the database level — resolves to the SAME row via
	 * `ON CONFLICT ... DO UPDATE ... RETURNING` (the returned row's fields may
	 * differ from the ones passed in when a concurrent caller won the race).
	 * Never used to mutate an existing job's progress — that is
	 * `advanceCursor` below.
	 */
	save(record: BackfillJobRecord): Promise<BackfillJobRecord>;
	/**
	 * Atomically advances a job's cursor/rowsIngested/status in place,
	 * enforcing the state machine at the database level so two concurrent
	 * advances (or an out-of-order retry) can never regress progress or
	 * mutate a job that is no longer advanceable:
	 *
	 *   UPDATE ... WHERE id = $id AND organization_id = $organizationId
	 *     AND status IN ('PENDING','RUNNING') AND rows_ingested <= $rowsIngested
	 *
	 * Returns null (never throws) when no row matched that predicate — the
	 * caller (advanceBackfillCursor) maps that to MD_BACKFILL_INVALID_TRANSITION
	 * with a message describing which guard failed.
	 */
	advanceCursor(input: {
		id: string;
		organizationId: string;
		cursorPosition: string | null;
		rowsIngested: number;
		status: "RUNNING" | "COMPLETED";
		lastError: string | null;
	}): Promise<BackfillJobRecord | null>;
}
