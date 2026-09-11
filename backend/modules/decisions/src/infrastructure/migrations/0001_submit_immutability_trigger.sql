-- ANX-149 S1: enforce append-only trade intents and submitted decision immutability (G3-DC-S2-02).

CREATE OR REPLACE FUNCTION decisions_block_submitted_record_mutation()
RETURNS TRIGGER AS $$
BEGIN
	IF OLD.status = 'SUBMITTED' AND (
		NEW.status IS DISTINCT FROM OLD.status
		OR NEW.grant_id IS DISTINCT FROM OLD.grant_id
		OR NEW.expected_authority_epoch IS DISTINCT FROM OLD.expected_authority_epoch
		OR NEW.correlation_id IS DISTINCT FROM OLD.correlation_id
		OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
	) THEN
		RAISE EXCEPTION 'DC_INTENT_IMMUTABLE';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS decisions_records_immutable_after_submit ON decisions_records;

CREATE TRIGGER decisions_records_immutable_after_submit
	BEFORE UPDATE ON decisions_records
	FOR EACH ROW
	EXECUTE FUNCTION decisions_block_submitted_record_mutation();

CREATE OR REPLACE FUNCTION decisions_block_trade_intent_mutation()
RETURNS TRIGGER AS $$
BEGIN
	RAISE EXCEPTION 'DC_INTENT_IMMUTABLE';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS decisions_trade_intents_append_only ON decisions_trade_intents;

CREATE TRIGGER decisions_trade_intents_append_only
	BEFORE UPDATE OR DELETE ON decisions_trade_intents
	FOR EACH ROW
	EXECUTE FUNCTION decisions_block_trade_intent_mutation();
