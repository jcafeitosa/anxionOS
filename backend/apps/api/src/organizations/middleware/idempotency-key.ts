import { institutionalUuidSchema } from "@anxionos/contracts";
import { AppError } from "@anxionos/contracts/errors";

const idempotencyKeySchema = institutionalUuidSchema;

export function parseIdempotencyKey(headers: Headers): string {
	const raw = headers.get("idempotency-key") ?? headers.get("Idempotency-Key");
	if (!raw?.trim()) {
		throw AppError.validation("Idempotency-Key header is required");
	}
	const parsed = idempotencyKeySchema.safeParse(raw.trim());
	if (!parsed.success) {
		throw AppError.validation(
			"Idempotency-Key must be a valid institutional UUID",
		);
	}
	return parsed.data;
}
