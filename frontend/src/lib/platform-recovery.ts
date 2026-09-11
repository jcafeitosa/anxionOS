import { z } from "zod";

export const PLATFORM_RECOVERY_PATH = "/v1/operations/platform/recovery";

export const PLATFORM_RECOVERY_CONTRACT =
	"GET /v1/operations/platform/recovery (collection). Does not call agency recovery-tasks. Does not execute break-glass.";

const collectionBodySchema = z.object({
	recoveryTasks: z.array(z.unknown()),
});

export type PlatformRecoveryView =
	| { kind: "loading" }
	| { kind: "ready"; count: number }
	| {
			kind: "empty";
			reason: "no_recovery_tasks" | "collection_unavailable";
			status: number;
	  }
	| { kind: "denied"; status: number }
	| { kind: "stale"; status: number | null };

export function platformRecoveryViewFromResponse(
	status: number,
	body: unknown,
): Exclude<PlatformRecoveryView, { kind: "loading" }> {
	if (status === 401 || status === 403) {
		return { kind: "denied", status };
	}
	if (status === 404 || status === 405 || status === 422) {
		return { kind: "empty", reason: "collection_unavailable", status };
	}
	if (status < 200 || status >= 300) {
		return { kind: "stale", status };
	}
	const parsed = collectionBodySchema.safeParse(body);
	if (!parsed.success) {
		return { kind: "stale", status };
	}
	if (parsed.data.recoveryTasks.length === 0) {
		return { kind: "empty", reason: "no_recovery_tasks", status };
	}
	return { kind: "ready", count: parsed.data.recoveryTasks.length };
}

export async function fetchPlatformRecovery(
	fetchFn: typeof fetch = fetch,
): Promise<Exclude<PlatformRecoveryView, { kind: "loading" }>> {
	let response: Response;
	try {
		response = await fetchFn(PLATFORM_RECOVERY_PATH, {
			credentials: "include",
			headers: { Accept: "application/json" },
		});
	} catch {
		return { kind: "stale", status: null };
	}
	let body: unknown = null;
	const contentType = response.headers.get("content-type") ?? "";
	if (contentType.includes("application/json")) {
		try {
			body = await response.json();
		} catch {
			return { kind: "stale", status: response.status };
		}
	}
	return platformRecoveryViewFromResponse(response.status, body);
}

export function platformRecoveryEmptyDescription(
	reason: "no_recovery_tasks" | "collection_unavailable",
): string {
	if (reason === "no_recovery_tasks") {
		return `Nenhuma tarefa de recovery de plataforma. Contrato: ${PLATFORM_RECOVERY_CONTRACT}`;
	}
	return `Listagem de recovery ainda não existe. ${PLATFORM_RECOVERY_CONTRACT}`;
}
