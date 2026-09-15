-- ANX-518: command intent and tenant-scoped replay.
-- Existing rows without request_hash remain legacy and fail closed on replay.
ALTER TABLE market_data_command_journal
	ADD COLUMN IF NOT EXISTS request_hash TEXT;

ALTER TABLE market_data_command_journal
	DROP CONSTRAINT IF EXISTS market_data_command_journal_pkey;

ALTER TABLE market_data_command_journal
	ADD PRIMARY KEY (organization_id, command_id);
