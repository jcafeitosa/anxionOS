-- ANX-520 — redact unsafe referral IDs in legacy idempotency snapshots.
--
-- This is separate from the table-text remediation so databases that already
-- applied 0004 still receive the command-journal protection.

UPDATE partners_command_journal
SET response_snapshot = jsonb_set(
	response_snapshot,
	'{referralId}',
	to_jsonb(format('[REDACTED:%s]', command_id::text)),
	false
)
WHERE jsonb_typeof(response_snapshot -> 'referralId') = 'string'
	AND (
		(response_snapshot ->> 'referralId') ~ '[[:cntrl:]]'
		OR (response_snapshot ->> 'referralId') ~* '(api[_-]?key|authorization|bearer|credential|password|private[_-]?key|secret|token)[[:space:]]*([:=]|[[:space:]])+[[:space:]]*[^[:space:],]+'
		OR (response_snapshot ->> 'referralId') ~* '(postgres(ql)?|mysql|mongodb(\+srv)?|redis|amqp)://'
		OR (response_snapshot ->> 'referralId') ~* '-----[A-Z0-9 ]*(BEGIN|END)[A-Z0-9 ]*PRIVATE KEY-----'
		OR (response_snapshot ->> 'referralId') ~* '(^|[^A-Za-z0-9])(sk|pk)_(live|test)_'
		OR (response_snapshot ->> 'referralId') ~* '(^|[^A-Za-z0-9])gh[pousr]_'
		OR (response_snapshot ->> 'referralId') ~* '(^|[^A-Za-z0-9])github_pat_'
		OR (response_snapshot ->> 'referralId') ~* '(^|[^A-Za-z0-9])xox[baprs]-'
		OR (response_snapshot ->> 'referralId') ~* '(^|[^A-Za-z0-9])AKIA[0-9A-Z]{16}'
		OR (response_snapshot ->> 'referralId') ~ '(^|[^A-Za-z0-9_-])[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}([^A-Za-z0-9_-]|$)'
		OR (response_snapshot ->> 'referralId') ~ '(^|[^A-Fa-f0-9])[A-Fa-f0-9]{32,}([^A-Fa-f0-9]|$)'
		OR (response_snapshot ->> 'referralId') ~ '(^|[^A-Za-z0-9+/])[A-Za-z0-9+/]{32,}={0,2}([^A-Za-z0-9+/]|$)'
	);
