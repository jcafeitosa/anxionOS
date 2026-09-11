import { z } from "zod";

export const AGENCY_MEMBERSHIPS_COLLECTION_PATH =
	"/v1/organizations/agencies/:agencyId/memberships";

/** Public organizations query — list memberships for the agency scope. */
export const MEMBERSHIPS_COLLECTION_CONTRACT =
	"GET /v1/organizations/agencies/:agencyId/memberships (collection). organizations plugin listMemberships; membershipDtoSchema em @anxionos/contracts/organizations. ANX-135 done. ANX-401 slice 2.";

const membershipRoleSchema = z.enum(["owner", "admin", "operator", "viewer"]);
const membershipStatusSchema = z.enum(["invited", "active", "revoked"]);

export const membershipItemSchema = z.object({
	id: z.string().uuid(),
	agencyId: z.string().uuid(),
	principalId: z.string().uuid().nullable(),
	role: membershipRoleSchema,
	status: membershipStatusSchema,
	invitedAt: z.string().datetime().optional(),
	joinedAt: z.string().datetime().optional(),
	revokedAt: z.string().datetime().optional(),
	revision: z.number().int().nonnegative(),
});

export type MembershipItem = z.infer<typeof membershipItemSchema>;

const collectionBodySchema = z.union([
	z.array(membershipItemSchema),
	z.object({ memberships: z.array(membershipItemSchema) }),
	z.object({ items: z.array(membershipItemSchema) }),
]);

export type AgencyMembershipsView =
	| { kind: "loading" }
	| { kind: "ready"; items: readonly MembershipItem[] }
	| { kind: "empty"; reason: "no_members" | "collection_unavailable"; status: number }
	| { kind: "denied"; status: number }
	| { kind: "stale"; status: number | null };

export type AgencyMembershipsFetchFn = typeof fetch;

export function agencyMembershipsCollectionUrl(agencyId: string): string {
	return `/v1/organizations/agencies/${encodeURIComponent(agencyId)}/memberships`;
}

function itemsFromBody(body: unknown): MembershipItem[] | null {
	const parsed = collectionBodySchema.safeParse(body);
	if (!parsed.success) {
		return null;
	}
	if (Array.isArray(parsed.data)) {
		return parsed.data;
	}
	if ("memberships" in parsed.data) {
		return parsed.data.memberships;
	}
	return parsed.data.items;
}

/**
 * Maps a live GET of the agency memberships collection. 404/405 mean the public
 * list surface is absent — honest empty, not a mock table.
 */
export function membershipsViewFromResponse(
	status: number,
	body: unknown,
): Exclude<AgencyMembershipsView, { kind: "loading" }> {
	if (status === 401 || status === 403) {
		return { kind: "denied", status };
	}
	if (status === 404 || status === 405 || status === 422) {
		return { kind: "empty", reason: "collection_unavailable", status };
	}
	if (status < 200 || status >= 300) {
		return { kind: "stale", status };
	}
	const items = itemsFromBody(body);
	if (items === null) {
		return { kind: "stale", status };
	}
	if (items.length === 0) {
		return { kind: "empty", reason: "no_members", status };
	}
	return { kind: "ready", items };
}

export async function fetchAgencyMemberships(
	agencyId: string,
	fetchFn: AgencyMembershipsFetchFn = fetch,
): Promise<Exclude<AgencyMembershipsView, { kind: "loading" }>> {
	let response: Response;
	try {
		response = await fetchFn(agencyMembershipsCollectionUrl(agencyId), {
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

	return membershipsViewFromResponse(response.status, body);
}

export function membershipEmptyDescription(
	reason: "no_members" | "collection_unavailable",
): string {
	if (reason === "no_members") {
		return `Nenhum membership registado nesta agência. Contrato: ${MEMBERSHIPS_COLLECTION_CONTRACT}`;
	}
	return `Listagem pública ainda não existe. ${MEMBERSHIPS_COLLECTION_CONTRACT}`;
}

export function membershipDisplayLabel(item: MembershipItem): string {
	if (item.status === "invited" && !item.principalId) {
		return "convite pendente";
	}
	return item.principalId ?? "principal ausente";
}
