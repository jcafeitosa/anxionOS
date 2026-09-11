import { z } from "zod";

export const PLATFORM_RUNTIMES_PATH = "/v1/operations/platform/runtimes";

export const PLATFORM_RUNTIMES_CONTRACT =
	"GET /v1/operations/platform/runtimes (collection). Does not copy Agency metrics.";

const collectionBodySchema = z.object({
	runtimes: z.array(z.unknown()),
});

export type PlatformRuntimesView =
	| { kind: "loading" }
	| { kind: "ready"; count: number }
	| { kind: "empty"; reason: "no_runtimes" | "collection_unavailable"; status: number }
	| { kind: "denied"; status: number }
	| { kind: "stale"; status: number | null };

export function platformRuntimesViewFromResponse(
	status: number,
	body: unknown,
): Exclude<PlatformRuntimesView, { kind: "loading" }> {
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
	if (parsed.data.runtimes.length === 0) {
		return { kind: "empty", reason: "no_runtimes", status };
	}
	return { kind: "ready", count: parsed.data.runtimes.length };
}

export async function fetchPlatformRuntimes(
	fetchFn: typeof fetch = fetch,
): Promise<Exclude<PlatformRuntimesView, { kind: "loading" }>> {
	let response: Response;
	try {
		response = await fetchFn(PLATFORM_RUNTIMES_PATH, {
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
	return platformRuntimesViewFromResponse(response.status, body);
}

export function platformRuntimesEmptyDescription(
	reason: "no_runtimes" | "collection_unavailable",
): string {
	if (reason === "no_runtimes") {
		return `Nenhum runtime de plataforma. Contrato: ${PLATFORM_RUNTIMES_CONTRACT}`;
	}
	return `Listagem de runtimes ainda não existe. ${PLATFORM_RUNTIMES_CONTRACT}`;
}
