-- ANX-520 — persist semantic command intent and isolate journal keys by organization.
ALTER TABLE partners_command_journal
	ADD COLUMN IF NOT EXISTS request_hash TEXT;

DO $$
DECLARE
	primary_key_name TEXT;
BEGIN
	SELECT constraint_name INTO primary_key_name
	FROM information_schema.table_constraints
	WHERE table_name = 'partners_command_journal'
	  AND constraint_type = 'PRIMARY KEY';

	IF primary_key_name IS NOT NULL THEN
		EXECUTE format(
			'ALTER TABLE partners_command_journal DROP CONSTRAINT %I',
			primary_key_name
		);
	END IF;

	ALTER TABLE partners_command_journal
		ADD PRIMARY KEY (organization_id, command_id);
END $$;

CREATE INDEX IF NOT EXISTS partners_command_journal_org_command_idx
	ON partners_command_journal (organization_id, command_id);
CREATE INDEX IF NOT EXISTS partners_command_journal_org_invoice_idx
	ON partners_command_journal (organization_id, invoice_id)
	WHERE invoice_id IS NOT NULL;
