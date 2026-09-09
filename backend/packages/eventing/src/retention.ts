/**
 * Retention and replay policy for eventing (P02 / ANX-130).
 *
 * Retention:
 * - PostgreSQL `domain_journal` / `outbox`: owned by the writer module; rows remain
 *   until relay marks outbox `published` and operational backup policy applies.
 * - JetStream `EVENTS` stream: bounded by `jetStreamMaxAgeNs` (default 7 days).
 * - `dead_letter_queue`: retained for operator review (`dlqRetentionDays`, default 30).
 *
 * Replay:
 * - Outbox relay republishes only `pending` rows; JetStream dedupe uses `msgID=eventId`.
 * - DLQ replay and cross-stream rebuild require authorized tooling (ANX-133 / ANX-155).
 * - Consumers must call `processWithInbox` so redelivery does not duplicate side effects.
 */
export const DEFAULT_DLQ_RETENTION_DAYS = 30;
export const DEFAULT_JETSTREAM_MAX_AGE_NS = 7 * 24 * 60 * 60 * 1_000_000_000;

export interface RetentionPolicy {
	dlqRetentionDays: number;
	jetStreamMaxAgeNs: number;
}

export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
	dlqRetentionDays: DEFAULT_DLQ_RETENTION_DAYS,
	jetStreamMaxAgeNs: DEFAULT_JETSTREAM_MAX_AGE_NS,
};
