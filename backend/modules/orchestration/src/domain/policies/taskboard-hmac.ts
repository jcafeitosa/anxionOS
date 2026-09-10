import { createHmac, timingSafeEqual } from "node:crypto";

export interface TaskboardHmacConfig {
	secret: string | null;
	required: boolean;
}

export function resolveTaskboardHmacConfig(
	env: NodeJS.ProcessEnv = process.env,
): TaskboardHmacConfig {
	const secret = env.TASKBOARD_WEBHOOK_SECRET?.trim() || null;
	const required =
		env.ORC_WEBHOOK_HMAC_REQUIRED === "true" ||
		env.ORC_WEBHOOK_HMAC_REQUIRED === "1";
	return { secret, required };
}
function normalizeSignature(signature: string) {
	const trimmed = signature.trim();
	if (trimmed.startsWith("sha256=")) {
		return trimmed.slice("sha256=".length);
	}
	return trimmed;
}
export function computeTaskboardHmac(payload: string, secret: string): string {
	return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}
export function verifyTaskboardHmac(
	payload: string,
	signature: string,
	config: TaskboardHmacConfig,
): boolean {
	if (!config.secret) {
		return !config.required;
	}
	if (!signature) {
		return false;
	}
	const expected = computeTaskboardHmac(payload, config.secret);
	const provided = normalizeSignature(signature);
	if (expected.length !== provided.length) {
		return false;
	}
	try {
		return timingSafeEqual(
			Buffer.from(expected, "utf8"),
			Buffer.from(provided, "utf8"),
		);
	} catch {
		return false;
	}
}
