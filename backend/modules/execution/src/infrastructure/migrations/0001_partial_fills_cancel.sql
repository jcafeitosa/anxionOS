-- ANX-151 S3: partial fill tracking and extended order statuses.

DO $$ BEGIN
	ALTER TYPE execution_order_status ADD VALUE IF NOT EXISTS 'PARTIALLY_FILLED';
EXCEPTION
	WHEN undefined_object THEN
		ALTER TABLE execution_orders
			DROP CONSTRAINT IF EXISTS execution_orders_status_check;
		ALTER TABLE execution_orders
			ADD CONSTRAINT execution_orders_status_check
			CHECK (status IN ('SUBMITTED', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED'));
END $$;

ALTER TABLE execution_orders
	ADD COLUMN IF NOT EXISTS filled_quantity NUMERIC NOT NULL DEFAULT 0;

UPDATE execution_orders
SET filled_quantity = quantity
WHERE filled_quantity = 0 AND status::text = 'SUBMITTED';
