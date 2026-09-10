-- partial unique indexes for membership invariants
CREATE UNIQUE INDEX IF NOT EXISTS organizations_memberships_agency_principal_active_uidx
 ON organizations_memberships (agency_id, principal_id)
 WHERE status = 'active' AND principal_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS organizations_memberships_agency_email_invited_uidx
 ON organizations_memberships (agency_id, lower(invite_email))
 WHERE status = 'invited' AND invite_email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS organizations_memberships_one_owner_active_uidx
 ON organizations_memberships (agency_id)
 WHERE role = 'owner' AND status = 'active';
