CREATE UNIQUE INDEX IF NOT EXISTS governance_autonomy_assignments_one_active_per_agent_idx
  ON governance_autonomy_assignments (scope_id, subject_agent_id)
  WHERE status = 'active';
