import { z } from "zod";

/**
 * RFC 4122 UUIDs for tenant/RLS boundaries (versions 1–5, variant 8/9/a/b).
 * Stricter than Zod's `.uuid()` — rejects nil UUID, v6+, and non-RFC variants.
 * Must stay aligned with `@anxionos/database` `assertUuid` / tenant-context.
 */
export const INSTITUTIONAL_UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const institutionalUuidSchema = z
	.string()
	.regex(INSTITUTIONAL_UUID_PATTERN, "Invalid institutional UUID");

export function isInstitutionalUuid(value: string): boolean {
	return INSTITUTIONAL_UUID_PATTERN.test(value);
}
