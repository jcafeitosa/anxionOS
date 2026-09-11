import { z } from "zod";

export const RISK_KILL_SWITCH_STATUS_PATH =
	"/v1/risk/agencies/:agencyId/kill-switch";

/** Public risk query — organization kill switch status (ANX-165 S7). */
export const KILL_SWITCH_READ_CONTRACT =
	"GET /v1/risk/agencies/:agencyId/kill-switch. Montado em apps/api via createRiskPlugin; DTO alinhado a riskKillSwitchScopeSchema e riskCommandResultSchema em @anxionos/contracts/risk.";

const riskKillSwitchScopeSchema = z.enum(["ORGANIZATION", "PORTFOLIO"]);

const killSwitchStatusSchema = z.object({
	killSwitchId: z
		.string()
		.regex(/^rk_ksw_[0-9a-f-]{36}$/i)
		.optional(),
	organizationId: z.string().uuid(),
	scope: riskKillSwitchScopeSchema,
	portfolioId: z.string().min(1).nullable().optional(),
	killSwitchActive: z.boolean(),
	reason: z.string().nullable().optional(),
	activatedBy: z.string().nullable().optional(),
	activatedAt: z.string().datetime().nullable().optional(),
	releasedBy: z.string().nullable().optional(),
	releasedAt: z.string().datetime().nullable().optional(),
	riskEpoch: z.number().int().nonnegative().optional(),
});

export type KillSwitchStatus = z.infer<typeof killSwitchStatusSchema>;

const statusBodySchema = z.union([
	killSwitchStatusSchema,
	z.object({ status: killSwitchStatusSchema }),
	z.object({ killSwitch: killSwitchStatusSchema }),
]);

export type AgencyKillSwitchView =
	| { kind: "loading" }
	| { kind: "ready"; status: KillSwitchStatus }
	| { kind: "empty"; reason: "collection_unavailable"; status: number }
	| { kind: "denied"; status: number }
	| { kind: "stale"; status: number | null };

export type AgencyKillSwitchFetchFn = typeof fetch;

export function agencyKillSwitchStatusUrl(agencyId: string): string {
	return `/v1/risk/agencies/${encodeURIComponent(agencyId)}/kill-switch`;
}

function statusFromBody(body: unknown): KillSwitchStatus | null {
	const parsed = statusBodySchema.safeParse(body);
	if (!parsed.success) {
		return null;
	}
	if ("status" in parsed.data) {
		return parsed.data.status;
	}
	if ("killSwitch" in parsed.data) {
		return parsed.data.killSwitch;
	}
	return parsed.data;
}

/**
 * Maps a live GET of the agency kill switch status. 404/405 mean the
 * public read surface is absent — honest empty, not a mock panel.
 */
export function killSwitchViewFromResponse(
	status: number,
	body: unknown,
): Exclude<AgencyKillSwitchView, { kind: "loading" }> {
	if (status === 401 || status === 403) {
		return { kind: "denied", status };
	}
	if (status === 404 || status === 405 || status === 422) {
		return { kind: "empty", reason: "collection_unavailable", status };
	}
	if (status < 200 || status >= 300) {
		return { kind: "stale", status };
	}
	const killSwitchStatus = statusFromBody(body);
	if (killSwitchStatus === null) {
		return { kind: "stale", status };
	}
	return { kind: "ready", status: killSwitchStatus };
}

export async function fetchAgencyKillSwitchStatus(
	agencyId: string,
	fetchFn: AgencyKillSwitchFetchFn = fetch,
): Promise<Exclude<AgencyKillSwitchView, { kind: "loading" }>> {
	let response: Response;
	try {
		response = await fetchFn(agencyKillSwitchStatusUrl(agencyId), {
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

	return killSwitchViewFromResponse(response.status, body);
}

export function killSwitchEmptyDescription(
	reason: "collection_unavailable",
): string {
	return `Superfície pública ainda não existe. ${KILL_SWITCH_READ_CONTRACT}`;
}

export function killSwitchDisplayLabel(status: KillSwitchStatus): string {
	const scopeLabel =
		status.scope === "PORTFOLIO" && status.portfolioId
			? `PORTFOLIO · ${status.portfolioId}`
			: status.scope;
	if (!status.killSwitchActive) {
		return `Inativo · ${scopeLabel}`;
	}
	const reasonSuffix =
		status.reason && status.reason.length > 0 ? ` · ${status.reason}` : "";
	return `ATIVO · ${scopeLabel}${reasonSuffix}`;
}

export function killSwitchMutationsAvailable(
	view: Exclude<AgencyKillSwitchView, { kind: "loading" }>,
): boolean {
	return view.kind === "ready";
}
