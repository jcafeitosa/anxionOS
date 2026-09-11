import { z } from "zod";

export const PLATFORM_INCIDENTS_PATH = "/v1/operations/platform/incidents";

export const PLATFORM_INCIDENTS_CONTRACT =
	"GET /v1/operations/platform/incidents (collection). Does not call /v1/operations/agencies/:agencyId/incidents.";

const collectionBodySchema = z.object({
	incidents: z.array(z.unknown()),
});

export type PlatformIncidentsView =
	| { kind: "loading" }
	| { kind: "ready"; count: number }
	| { kind: "empty"; reason: "no_incidents" | "collection_unavailable"; status: number }
	| { kind: "denied"; status: number }
	| { kind: "stale"; status: number | null };

export function platformIncidentsViewFromResponse(
	status: number,
	body: unknown,
): Exclude<PlatformIncidentsView, { kind: "loading" }> {
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
	if (parsed.data.incidents.length === 0) {
		return { kind: "empty", reason: "no_incidents", status };
	}
	return { kind: "ready", count: parsed.data.incidents.length };
}

export async function fetchPlatformIncidents(
	fetchFn: typeof fetch = fetch,
): Promise<Exclude<PlatformIncidentsView, { kind: "loading" }>> {
	let response: Response;
	try {
		response = await fetchFn(PLATFORM_INCIDENTS_PATH, {
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
	return platformIncidentsViewFromResponse(response.status, body);
}

export function platformIncidentsEmptyDescription(
	reason: "no_incidents" | "collection_unavailable",
): string {
	if (reason === "no_incidents") {
		return `Nenhum incidente de plataforma. Contrato: ${PLATFORM_INCIDENTS_CONTRACT}`;
	}
	return `Listagem de plataforma ainda não existe. ${PLATFORM_INCIDENTS_CONTRACT}`;
}
