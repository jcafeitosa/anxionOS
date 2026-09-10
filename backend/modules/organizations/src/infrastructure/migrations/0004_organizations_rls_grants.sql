-- ANX-256: Grant application/service roles access to RLS-protected organizations tables

GRANT SELECT, INSERT, UPDATE, DELETE ON organizations_agencies TO anxion_app, anxion_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON organizations_owners TO anxion_app, anxion_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON organizations_memberships TO anxion_app, anxion_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON organizations_command_journal TO anxion_app, anxion_service;
