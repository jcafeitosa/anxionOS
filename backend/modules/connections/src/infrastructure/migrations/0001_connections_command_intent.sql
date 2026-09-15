-- Persist command intent and scope command journal keys by organization.
-- Legacy rows retain a nullable hash and fail closed during replay validation.
ALTER TABLE connections_inference_requests
 ADD COLUMN IF NOT EXISTS request_hash TEXT;

ALTER TABLE connections_command_journal
 ADD COLUMN IF NOT EXISTS request_hash TEXT;

ALTER TABLE connections_command_journal
 DROP CONSTRAINT IF EXISTS connections_command_journal_pkey;

ALTER TABLE connections_command_journal
 ADD PRIMARY KEY (organization_id, command_id);

CREATE UNIQUE INDEX IF NOT EXISTS connections_inference_org_idempotency_uidx
 ON connections_inference_requests (organization_id, idempotency_key);
