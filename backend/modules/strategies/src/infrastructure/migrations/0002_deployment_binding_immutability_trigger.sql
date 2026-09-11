-- ANX-147 S4: binding snapshot is immutable after deployment activation.

CREATE OR REPLACE FUNCTION strategies_block_deployment_binding_mutation()
RETURNS TRIGGER AS $$
BEGIN
	IF OLD.binding_snapshot IS DISTINCT FROM NEW.binding_snapshot THEN
		RAISE EXCEPTION 'ST_BINDING_IMMUTABLE';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS strategies_deployments_binding_immutable ON strategies_deployments;

CREATE TRIGGER strategies_deployments_binding_immutable
	BEFORE UPDATE ON strategies_deployments
	FOR EACH ROW
	EXECUTE FUNCTION strategies_block_deployment_binding_mutation();
