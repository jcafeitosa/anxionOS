import { z } from "zod";

export const AGENCY_CHANGE_PROPOSALS_COLLECTION_PATH =
	"/v1/agencies/:agencyId/change-proposals";

/** Public governance query — pending change proposals for agency scope. */
export const APPROVALS_COLLECTION_CONTRACT =
	"GET /v1/agencies/:agencyId/change-proposals (collection). createGovernancePlugin handleListPendingChangeProposals → findPendingByScope; DTO em handlers/change-proposals toChangeProposalDto. Resolver: POST /v1/governance/approvals/resolve. ANX-404 slice 5.";

const changeProposalKindSchema = z.enum([
	"SOFTWARE",
	"INSTITUTIONAL",
	"HIERARCHY_MODE",
]);
const changeProposalStatusSchema = z.enum([
	"pending",
	"approved",
	"rejected",
	"superseded",
]);

export const changeProposalItemSchema = z.object({
	id: z.string().uuid(),
	tenantId: z.string().uuid(),
	agencyId: z.string().uuid(),
	scopeId: z.string().uuid(),
	kind: changeProposalKindSchema,
	payloadHash: z.string().min(1),
	proposerPrincipalId: z.string().uuid(),
	status: changeProposalStatusSchema,
	requiredApprovals: z.number().int().positive(),
	revision: z.number().int().nonnegative(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export type ChangeProposalItem = z.infer<typeof changeProposalItemSchema>;

const collectionBodySchema = z.union([
	z.array(changeProposalItemSchema),
	z.object({ changeProposals: z.array(changeProposalItemSchema) }),
	z.object({ items: z.array(changeProposalItemSchema) }),
]);

export type AgencyApprovalsView =
	| { kind: "loading" }
	| { kind: "ready"; items: readonly ChangeProposalItem[] }
	| { kind: "empty"; reason: "no_pending" | "collection_unavailable"; status: number }
	| { kind: "denied"; status: number }
	| { kind: "stale"; status: number | null };

export type AgencyApprovalsFetchFn = typeof fetch;

export function agencyChangeProposalsCollectionUrl(agencyId: string): string {
	return `/v1/agencies/${encodeURIComponent(agencyId)}/change-proposals`;
}

function itemsFromBody(body: unknown): ChangeProposalItem[] | null {
	const parsed = collectionBodySchema.safeParse(body);
	if (!parsed.success) {
		return null;
	}
	if (Array.isArray(parsed.data)) {
		return parsed.data;
	}
	if ("changeProposals" in parsed.data) {
		return parsed.data.changeProposals;
	}
	return parsed.data.items;
}

/**
 * Maps a live GET of the agency change-proposals collection. 404/405 mean the
 * public list surface is absent — honest empty, not a mock queue.
 */
export function approvalsViewFromResponse(
	status: number,
	body: unknown,
): Exclude<AgencyApprovalsView, { kind: "loading" }> {
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
		return { kind: "empty", reason: "no_pending", status };
	}
	return { kind: "ready", items };
}

export async function fetchAgencyChangeProposals(
	agencyId: string,
	fetchFn: AgencyApprovalsFetchFn = fetch,
): Promise<Exclude<AgencyApprovalsView, { kind: "loading" }>> {
	let response: Response;
	try {
		response = await fetchFn(agencyChangeProposalsCollectionUrl(agencyId), {
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

	return approvalsViewFromResponse(response.status, body);
}

export function approvalEmptyDescription(
	reason: "no_pending" | "collection_unavailable",
): string {
	if (reason === "no_pending") {
		return `Nenhuma ChangeProposal pendente nesta agência. Contrato: ${APPROVALS_COLLECTION_CONTRACT}`;
	}
	return `Listagem pública ainda não existe. ${APPROVALS_COLLECTION_CONTRACT}`;
}

export function approvalDisplayLabel(item: ChangeProposalItem): string {
	return `${item.kind} · ${item.status} · ${item.requiredApprovals} aprovação(ões)`;
}

export const APPROVAL_RESOLVE_CONTRACT =
	"POST /v1/governance/approvals/resolve — resolve aprovação de ChangeProposal (command idempotente). O Owner console lista pendentes; resolver exige commandId e changeProposalId.";
