import { z } from "zod";

const PARTNER_SECRET_PATTERN =
	/(?:api[_-]?key|authorization|bearer|credential|password|private[_-]?key|secret|token)\s*(?:[:=]|\s+)\s*[^\s,]+|(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/|-----(?:BEGIN|END)(?: [A-Z0-9]+)* PRIVATE KEY-----/i;
const PARTNER_CREDENTIAL_PREFIX_PATTERN =
	/^(?:sk|pk)_(?:live|test)_|^gh[pousr]_|^github_pat_|^xox[baprs]-|^AKIA[0-9A-Z]{16}/i;
const PARTNER_CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const PARTNER_JWT_PATTERN =
	/\b[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/;
const PARTNER_HIGH_ENTROPY_TOKEN_PATTERN =
	/\b(?:[A-Fa-f0-9]{32,}|[A-Za-z0-9+/]{32,}={0,2})\b/;

export const PARTNER_SECRET_REJECTION_MESSAGE =
	"Partner references and reasons must not contain credentials or connection strings";
export const PARTNER_REDACTED_TEXT = "[REDACTED]";

export function isPartnerTextFreeOfSecrets(value: string): boolean {
	return (
		!PARTNER_SECRET_PATTERN.test(value) &&
		!PARTNER_CREDENTIAL_PREFIX_PATTERN.test(value) &&
		!PARTNER_CONTROL_CHARACTER_PATTERN.test(value) &&
		!PARTNER_JWT_PATTERN.test(value) &&
		!PARTNER_HIGH_ENTROPY_TOKEN_PATTERN.test(value)
	);
}

export function redactPartnerText(value: string | null): string | null {
	if (value === null || isPartnerTextFreeOfSecrets(value)) return value;
	return PARTNER_REDACTED_TEXT;
}

export const partnerDisplayNameSchema = z
	.string()
	.min(1)
	.max(256)
	.refine(isPartnerTextFreeOfSecrets, {
		message: PARTNER_SECRET_REJECTION_MESSAGE,
	});

export const partnerReferenceSchema = z
	.string()
	.regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/, "Partner reference must be opaque")
	.max(128)
	.refine(isPartnerTextFreeOfSecrets, {
		message: PARTNER_SECRET_REJECTION_MESSAGE,
	});

export const partnerReasonSchema = z
	.string()
	.min(1)
	.max(256)
	.refine(isPartnerTextFreeOfSecrets, {
		message: PARTNER_SECRET_REJECTION_MESSAGE,
	});
