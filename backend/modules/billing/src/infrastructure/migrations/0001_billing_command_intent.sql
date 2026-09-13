ALTER TABLE billing_command_journal
 ADD COLUMN IF NOT EXISTS request_hash TEXT;

ALTER TABLE billing_command_journal
 DROP CONSTRAINT IF EXISTS billing_command_journal_pkey;

ALTER TABLE billing_command_journal
 ADD CONSTRAINT billing_command_journal_pkey
 PRIMARY KEY (organization_id, command_id);
