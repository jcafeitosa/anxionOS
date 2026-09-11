const SENSITIVE_TAG_KEYS = new Set([
	"password",
	"secret",
	"token",
	"api_key",
	"apikey",
	"connection_string",
	"database_url",
	"authorization",
	"credential",
]);

const CONNECTION_STRING_PATTERN =
	/^(postgres(ql)?|mysql|mongodb(\+srv)?|redis|amqp):\/\//i;
const BEARER_PATTERN = /^bearer\s+/i;

export const REDACTED_METRIC_VALUE = "[redacted]";

export function isSensitiveMetricTagKey(key: string): boolean {
	const normalized = key.trim().toLowerCase();
	return SENSITIVE_TAG_KEYS.has(normalized);
}

export function redactMetricTagValue(key: string, value: string): string {
	if (isSensitiveMetricTagKey(key)) return REDACTED_METRIC_VALUE;
	if (CONNECTION_STRING_PATTERN.test(value)) return REDACTED_METRIC_VALUE;
	if (BEARER_PATTERN.test(value)) return REDACTED_METRIC_VALUE;
	if (value.length > 256) return REDACTED_METRIC_VALUE;
	return value;
}

export interface ParsedMetricKey {
	name: string;
	tags: Record<string, string>;
}

/** Parses `metric:tag1=val1,tag2=val2` keys from MetricsCollector snapshots. */
export function parseMetricKey(rawKey: string): ParsedMetricKey {
	const colonIdx = rawKey.indexOf(":");
	if (colonIdx === -1) {
		return { name: rawKey, tags: {} };
	}
	const name = rawKey.slice(0, colonIdx);
	const tagPart = rawKey.slice(colonIdx + 1);
	const tags: Record<string, string> = {};
	if (!tagPart) return { name, tags };
	for (const segment of tagPart.split(",")) {
		const eqIdx = segment.indexOf("=");
		if (eqIdx === -1) continue;
		const tagKey = segment.slice(0, eqIdx);
		const tagValue = segment.slice(eqIdx + 1);
		tags[tagKey] = redactMetricTagValue(tagKey, tagValue);
	}
	return { name, tags };
}
