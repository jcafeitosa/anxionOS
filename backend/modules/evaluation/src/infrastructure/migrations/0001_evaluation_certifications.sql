-- evaluation certifications foundation (ANX-160 S2).
-- Certification rows are authoritative; strategies consumes evaluation.certification.issued.v1.

DO $$ BEGIN
	CREATE TYPE evaluation_subject_kind AS ENUM ('strategy_version');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	CREATE TYPE evaluation_certification_status AS ENUM ('issued', 'revoked');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS evaluation_certifications (
	id TEXT PRIMARY KEY,
	organization_id UUID NOT NULL,
	subject_type evaluation_subject_kind NOT NULL,
	strategy_id TEXT NOT NULL,
	strategy_version_id TEXT NOT NULL,
	evaluation_record_id TEXT REFERENCES evaluation_records (id),
	policy_hash TEXT,
	status evaluation_certification_status NOT NULL DEFAULT 'issued',
	issued_at TIMESTAMPTZ NOT NULL,
	revoked_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS evaluation_certifications_subject_policy_uidx
	ON evaluation_certifications (
		organization_id,
		subject_type,
		strategy_id,
		strategy_version_id,
		COALESCE(policy_hash, '')
	);

CREATE INDEX IF NOT EXISTS evaluation_certifications_organization_id_idx
	ON evaluation_certifications (organization_id);

CREATE INDEX IF NOT EXISTS evaluation_certifications_record_id_idx
	ON evaluation_certifications (evaluation_record_id)
	WHERE evaluation_record_id IS NOT NULL;
