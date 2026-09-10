-- Scope command journal idempotency per tenant (G4 / cross-tenant isolation)
ALTER TABLE agents_command_journal
 ADD COLUMN IF NOT EXISTS tenant_id UUID;

DELETE FROM agents_command_journal WHERE tenant_id IS NULL;

ALTER TABLE agents_command_journal
 ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE agents_command_journal DROP CONSTRAINT IF EXISTS agents_command_journal_pkey;

ALTER TABLE agents_command_journal
 ADD PRIMARY KEY (tenant_id, command_id);
