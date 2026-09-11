-- ANX-171 G1: CANARY deployment lifecycle state for controlled rollout.

ALTER TABLE strategies_deployments
	DROP CONSTRAINT IF EXISTS strategies_deployments_status_check;

ALTER TABLE strategies_deployments
	ADD CONSTRAINT strategies_deployments_status_check CHECK (
		status IN ('CANARY', 'ACTIVE', 'PAUSED', 'ROLLED_BACK', 'RETIRED')
	);
