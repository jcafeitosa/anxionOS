-- ANX-147 S2: hash immutability follows published_at, not lifecycle promotion.
-- BACKTESTED is reached only after a completed backtest run (S3).

CREATE OR REPLACE FUNCTION strategies_block_published_version_mutation()
RETURNS TRIGGER AS $$
BEGIN
	IF OLD.published_at IS NOT NULL AND (
		NEW.source_hash IS DISTINCT FROM OLD.source_hash
		OR NEW.rules_hash IS DISTINCT FROM OLD.rules_hash
		OR NEW.parameters_hash IS DISTINCT FROM OLD.parameters_hash
		OR NEW.version_number IS DISTINCT FROM OLD.version_number
	) THEN
		RAISE EXCEPTION 'ST_VERSION_IMMUTABLE';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
