-- Persist the command payload fingerprint used to validate idempotent replay.
-- Existing rows remain nullable and are rejected by the application intent
-- validator because their original payload cannot be reconstructed safely.
ALTER TABLE agents_command_journal
 ADD COLUMN IF NOT EXISTS request_hash TEXT;
