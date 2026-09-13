-- ANX-520 — redact unsafe legacy partner text before it can be re-emitted.
--
-- New writes are rejected by the contract schemas. This migration handles
-- rows written before that boundary existed; API DTOs also redact defensively
-- because a bypassed write must never become an API disclosure.

UPDATE partners_partners
SET referral_code = format('[REDACTED:%s]', id)
WHERE referral_code ~* '(api[_-]?key|authorization|bearer|credential|password|private[_-]?key|secret|token)[[:space:]]*([:=]|[[:space:]])+[[:space:]]*[^[:space:],]+'
	OR referral_code ~* '(postgres(ql)?|mysql|mongodb(\+srv)?|redis|amqp)://'
	OR referral_code ~* '-----[A-Z0-9 ]*(BEGIN|END)[A-Z0-9 ]*PRIVATE KEY-----'
	OR referral_code ~* '(^|[^A-Za-z0-9])(sk|pk)_(live|test)_'
	OR referral_code ~* '(^|[^A-Za-z0-9])gh[pousr]_'
	OR referral_code ~* '(^|[^A-Za-z0-9])github_pat_'
	OR referral_code ~* '(^|[^A-Za-z0-9])xox[baprs]-'
	OR referral_code ~* '(^|[^A-Za-z0-9])AKIA[0-9A-Z]{16}'
	OR referral_code ~ '(^|[^A-Za-z0-9_-])[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}([^A-Za-z0-9_-]|$)'
	OR referral_code ~ '(^|[^A-Fa-f0-9])[A-Fa-f0-9]{32,}([^A-Fa-f0-9]|$)'
	OR referral_code ~ '(^|[^A-Za-z0-9+/])[A-Za-z0-9+/]{32,}={0,2}([^A-Za-z0-9+/]|$)';

UPDATE partners_partners
SET display_name = '[REDACTED]'
WHERE display_name ~* '(api[_-]?key|authorization|bearer|credential|password|private[_-]?key|secret|token)[[:space:]]*([:=]|[[:space:]])+[[:space:]]*[^[:space:],]+'
	OR display_name ~* '(postgres(ql)?|mysql|mongodb(\+srv)?|redis|amqp)://'
	OR display_name ~* '-----[A-Z0-9 ]*(BEGIN|END)[A-Z0-9 ]*PRIVATE KEY-----'
	OR display_name ~* '(^|[^A-Za-z0-9])(sk|pk)_(live|test)_'
	OR display_name ~* '(^|[^A-Za-z0-9])gh[pousr]_'
	OR display_name ~* '(^|[^A-Za-z0-9])github_pat_'
	OR display_name ~* '(^|[^A-Za-z0-9])xox[baprs]-'
	OR display_name ~* '(^|[^A-Za-z0-9])AKIA[0-9A-Z]{16}'
	OR display_name ~ '(^|[^A-Za-z0-9_-])[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}([^A-Za-z0-9_-]|$)'
	OR display_name ~ '(^|[^A-Fa-f0-9])[A-Fa-f0-9]{32,}([^A-Fa-f0-9]|$)'
	OR display_name ~ '(^|[^A-Za-z0-9+/])[A-Za-z0-9+/]{32,}={0,2}([^A-Za-z0-9+/]|$)';

UPDATE partners_payouts
SET approval_reference = CASE
		WHEN approval_reference IS NOT NULL THEN '[REDACTED]'
		ELSE approval_reference
	END
WHERE approval_reference IS NOT NULL
	AND (
		approval_reference ~* '(api[_-]?key|authorization|bearer|credential|password|private[_-]?key|secret|token)[[:space:]]*([:=]|[[:space:]])+[[:space:]]*[^[:space:],]+'
		OR approval_reference ~* '(postgres(ql)?|mysql|mongodb(\+srv)?|redis|amqp)://'
		OR approval_reference ~* '-----[A-Z0-9 ]*(BEGIN|END)[A-Z0-9 ]*PRIVATE KEY-----'
		OR approval_reference ~* '(^|[^A-Za-z0-9])(sk|pk)_(live|test)_'
		OR approval_reference ~* '(^|[^A-Za-z0-9])gh[pousr]_'
		OR approval_reference ~* '(^|[^A-Za-z0-9])github_pat_'
		OR approval_reference ~* '(^|[^A-Za-z0-9])xox[baprs]-'
		OR approval_reference ~* '(^|[^A-Za-z0-9])AKIA[0-9A-Z]{16}'
		OR approval_reference ~ '(^|[^A-Za-z0-9_-])[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}([^A-Za-z0-9_-]|$)'
		OR approval_reference ~ '(^|[^A-Fa-f0-9])[A-Fa-f0-9]{32,}([^A-Fa-f0-9]|$)'
		OR approval_reference ~ '(^|[^A-Za-z0-9+/])[A-Za-z0-9+/]{32,}={0,2}([^A-Za-z0-9+/]|$)'
	);

UPDATE partners_payouts
SET failure_reason = CASE
		WHEN failure_reason IS NOT NULL THEN '[REDACTED]'
		ELSE failure_reason
	END
WHERE failure_reason IS NOT NULL
	AND (
		failure_reason ~* '(api[_-]?key|authorization|bearer|credential|password|private[_-]?key|secret|token)[[:space:]]*([:=]|[[:space:]])+[[:space:]]*[^[:space:],]+'
		OR failure_reason ~* '(postgres(ql)?|mysql|mongodb(\+srv)?|redis|amqp)://'
		OR failure_reason ~* '-----[A-Z0-9 ]*(BEGIN|END)[A-Z0-9 ]*PRIVATE KEY-----'
		OR failure_reason ~* '(^|[^A-Za-z0-9])(sk|pk)_(live|test)_'
		OR failure_reason ~* '(^|[^A-Za-z0-9])gh[pousr]_'
		OR failure_reason ~* '(^|[^A-Za-z0-9])github_pat_'
		OR failure_reason ~* '(^|[^A-Za-z0-9])xox[baprs]-'
		OR failure_reason ~* '(^|[^A-Za-z0-9])AKIA[0-9A-Z]{16}'
		OR failure_reason ~ '(^|[^A-Za-z0-9_-])[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}([^A-Za-z0-9_-]|$)'
		OR failure_reason ~ '(^|[^A-Fa-f0-9])[A-Fa-f0-9]{32,}([^A-Fa-f0-9]|$)'
		OR failure_reason ~ '(^|[^A-Za-z0-9+/])[A-Za-z0-9+/]{32,}={0,2}([^A-Za-z0-9+/]|$)'
	);

UPDATE partners_payouts
SET provider_reference = CASE
		WHEN provider_reference IS NOT NULL THEN '[REDACTED]'
		ELSE provider_reference
	END
WHERE provider_reference IS NOT NULL
	AND (
		provider_reference ~* '(api[_-]?key|authorization|bearer|credential|password|private[_-]?key|secret|token)[[:space:]]*([:=]|[[:space:]])+[[:space:]]*[^[:space:],]+'
		OR provider_reference ~* '(postgres(ql)?|mysql|mongodb(\+srv)?|redis|amqp)://'
		OR provider_reference ~* '-----[A-Z0-9 ]*(BEGIN|END)[A-Z0-9 ]*PRIVATE KEY-----'
		OR provider_reference ~* '(^|[^A-Za-z0-9])(sk|pk)_(live|test)_'
		OR provider_reference ~* '(^|[^A-Za-z0-9])gh[pousr]_'
		OR provider_reference ~* '(^|[^A-Za-z0-9])github_pat_'
		OR provider_reference ~* '(^|[^A-Za-z0-9])xox[baprs]-'
		OR provider_reference ~* '(^|[^A-Za-z0-9])AKIA[0-9A-Z]{16}'
		OR provider_reference ~ '(^|[^A-Za-z0-9_-])[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}([^A-Za-z0-9_-]|$)'
		OR provider_reference ~ '(^|[^A-Fa-f0-9])[A-Fa-f0-9]{32,}([^A-Fa-f0-9]|$)'
		OR provider_reference ~ '(^|[^A-Za-z0-9+/])[A-Za-z0-9+/]{32,}={0,2}([^A-Za-z0-9+/]|$)'
	);

UPDATE partners_payouts
SET reversal_reference = CASE
		WHEN reversal_reference IS NOT NULL THEN '[REDACTED]'
		ELSE reversal_reference
	END
WHERE reversal_reference IS NOT NULL
	AND (
		reversal_reference ~* '(api[_-]?key|authorization|bearer|credential|password|private[_-]?key|secret|token)[[:space:]]*([:=]|[[:space:]])+[[:space:]]*[^[:space:],]+'
		OR reversal_reference ~* '(postgres(ql)?|mysql|mongodb(\+srv)?|redis|amqp)://'
		OR reversal_reference ~* '-----[A-Z0-9 ]*(BEGIN|END)[A-Z0-9 ]*PRIVATE KEY-----'
		OR reversal_reference ~* '(^|[^A-Za-z0-9])(sk|pk)_(live|test)_'
		OR reversal_reference ~* '(^|[^A-Za-z0-9])gh[pousr]_'
		OR reversal_reference ~* '(^|[^A-Za-z0-9])github_pat_'
		OR reversal_reference ~* '(^|[^A-Za-z0-9])xox[baprs]-'
		OR reversal_reference ~* '(^|[^A-Za-z0-9])AKIA[0-9A-Z]{16}'
		OR reversal_reference ~ '(^|[^A-Za-z0-9_-])[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}([^A-Za-z0-9_-]|$)'
		OR reversal_reference ~ '(^|[^A-Fa-f0-9])[A-Fa-f0-9]{32,}([^A-Fa-f0-9]|$)'
		OR reversal_reference ~ '(^|[^A-Za-z0-9+/])[A-Za-z0-9+/]{32,}={0,2}([^A-Za-z0-9+/]|$)'
	);
