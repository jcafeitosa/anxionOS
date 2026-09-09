const REDACTED = "[REDACTED]";

const SENSITIVE_KEY_PATTERN =
	/(password|secret|token|api[_-]?key|credential|private[_-]?key|authorization)/i;

const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const API_KEY_PATTERN =
	/\b(sk|pk|api)[-_][A-Za-z0-9]{16,}\b|\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g;

export function redactString(value: string): string {
	let result = value.replace(BEARER_PATTERN, `Bearer ${REDACTED}`);
	result = result.replace(API_KEY_PATTERN, REDACTED);
	return result;
}

export function redactValue(value: unknown): unknown {
	if (typeof value === "string") {
		return redactString(value);
	}
	if (Array.isArray(value)) {
		return value.map((item) => redactValue(item));
	}
	if (value !== null && typeof value === "object") {
		const record = value as Record<string, unknown>;
		const redacted: Record<string, unknown> = {};
		for (const [key, nested] of Object.entries(record)) {
			if (SENSITIVE_KEY_PATTERN.test(key)) {
				redacted[key] = REDACTED;
			} else {
				redacted[key] = redactValue(nested);
			}
		}
		return redacted;
	}
	return value;
}

export function assertNoPlaintextSecrets(payload: unknown): void {
	const serialized = JSON.stringify(payload);
	if (BEARER_PATTERN.test(serialized) || API_KEY_PATTERN.test(serialized)) {
		throw new Error("Plaintext secret material is not allowed in payload");
	}
}
