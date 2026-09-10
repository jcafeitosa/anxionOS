/** Polling interval for taskboard mirror sync worker (R09 S4). */
export const TASKBOARD_POLL_INTERVAL_MS = 60000;
/** Max pending heartbeats per organization before backpressure (R09 S5 / D-ORC-048). */
export const HEARTBEAT_QUEUE_CAP_PER_ORG = 10000;
/** Lease sweeper batch size (R09 S5 / D-ORC-047). */
export const LEASE_SWEEPER_BATCH_SIZE = 100;
/** Max jitter between lease sweeper batches in ms (R09 S5 / ORCH-R07-05). */
export const LEASE_SWEEPER_JITTER_MAX_MS = 30000;
/** T01 traversal evaluation timeout (R09 S6 / G3-10). */
export const T01_EVAL_TIMEOUT_MS = 2000;
/** Max gate disposition records per org per quota window (ANX-308). */
export const GATE_DISPOSITION_QUOTA_PER_ORG_PER_WINDOW = 500;
/** Rolling window for gate disposition quota in ms (1 hour). */
export const GATE_DISPOSITION_QUOTA_WINDOW_MS = 3_600_000;
/** Max wakeup units consumed per org before hard-stop (operational budget). */
export const OPERATIONAL_BUDGET_WAKEUP_UNITS_CAP_PER_ORG = 10_000;
