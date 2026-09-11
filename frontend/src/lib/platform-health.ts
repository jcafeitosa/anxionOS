import { z } from "zod";

export const PLATFORM_HEALTH_PATH = "/v1/operations/platform/health";

export const PLATFORM_HEALTH_CONTRACT =
	"GET /v1/operations/platform/health — probeHealthDeps (postgres/nats/neo4j) with source/checkedAt/stale. Requires console.platform grant. No agencyId.";

const healthDepSchema = z.enum(["ok", "error"]);

export const platformHealthSnapshotSchema = z.object({
	source: z.literal("probeHealthDeps"),
	checkedAt: z.string().datetime(),
	stale: z.boolean(),
	deps: z.object({
		postgres: healthDepSchema,
		nats: healthDepSchema,
		neo4j: healthDepSchema,
	}),
});

export type PlatformHealthSnapshot = z.infer<typeof platformHealthSnapshotSchema>;

export type PlatformHealthView =
	| { kind: "loading" }
	| { kind: "ready"; snapshot: PlatformHealthSnapshot }
	| { kind: "denied"; status: number }
	| { kind: "stale"; status: number | null }
	| { kind: "empty"; reason: "collection_unavailable"; status: number };

export function platformHealthViewFromResponse(
	status: number,
	body: unknown,
): Exclude<PlatformHealthView, { kind: "loading" }> {
	if (status === 401 || status === 403) {
		return { kind: "denied", status };
	}
	if (status === 404 || status === 405) {
		return { kind: "empty", reason: "collection_unavailable", status };
	}
	if (status < 200 || status >= 300) {
		return { kind: "stale", status };
	}
	const parsed = platformHealthSnapshotSchema.safeParse(body);
	if (!parsed.success) {
		return { kind: "stale", status };
	}
	return { kind: "ready", snapshot: parsed.data };
}

export async function fetchPlatformHealth(
	fetchFn: typeof fetch = fetch,
): Promise<Exclude<PlatformHealthView, { kind: "loading" }>> {
	let response: Response;
	try {
		response = await fetchFn(PLATFORM_HEALTH_PATH, {
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
	return platformHealthViewFromResponse(response.status, body);
}

export function platformHealthEmptyDescription(): string {
	return `Health de plataforma ainda não publicado. ${PLATFORM_HEALTH_CONTRACT}`;
}
