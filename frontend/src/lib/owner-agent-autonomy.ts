import { z } from "zod";

export const AGENT_AUTONOMY_PATH =
	"/v1/agencies/:agencyId/agents/:agentId/autonomy";

/** Per-agent governance query — effective autonomy for one agent in agency scope. */
export const AUTONOMY_PER_AGENT_CONTRACT =
	"GET /v1/agencies/:agencyId/agents/:agentId/autonomy — requer agentId; matriz global em GET /v1/governance/autonomy/matrix. Nível L0–L4 só quando a API devolve; sem atribuição = honesto vazio. ANX-403 slice 4.";

const autonomyLevelSchema = z.enum(["L0", "L1", "L2", "L3", "L4"]);

const autonomyAssignmentSchema = z.object({
	id: z.string().uuid(),
	scopeId: z.string().uuid(),
	subjectAgentId: z.string().uuid(),
	level: autonomyLevelSchema,
	status: z.string().min(1),
	evidenceHash: z.string().nullable().optional(),
	approvalId: z.string().uuid().nullable().optional(),
	authorityEpochAtAssignment: z.number().int().nonnegative().optional(),
	revision: z.number().int().nonnegative().optional(),
	createdAt: z.string().datetime().optional(),
	updatedAt: z.string().datetime().optional(),
});

const autonomyBodySchema = z.object({
	level: autonomyLevelSchema.nullable(),
	assignment: autonomyAssignmentSchema.nullable().optional(),
});

export type AgentAutonomyView =
	| { kind: "loading" }
	| {
			kind: "ready";
			level: string;
			assignmentStatus: string | null;
			assignmentRevision: number | null;
		}
	| { kind: "unassigned" }
	| { kind: "denied"; status: number }
	| { kind: "stale"; status: number | null };

export type AgentAutonomyFetchFn = typeof fetch;

export function agentAutonomyUrl(agencyId: string, agentId: string): string {
	return `/v1/agencies/${encodeURIComponent(agencyId)}/agents/${encodeURIComponent(agentId)}/autonomy`;
}

export function autonomyViewFromResponse(
	status: number,
	body: unknown,
): Exclude<AgentAutonomyView, { kind: "loading" }> {
	if (status === 401 || status === 403) {
		return { kind: "denied", status };
	}
	if (status < 200 || status >= 300) {
		return { kind: "stale", status };
	}
	const parsed = autonomyBodySchema.safeParse(body);
	if (!parsed.success) {
		return { kind: "stale", status };
	}
	if (parsed.data.level === null) {
		return { kind: "unassigned" };
	}
	return {
		kind: "ready",
		level: parsed.data.level,
		assignmentStatus: parsed.data.assignment?.status ?? null,
		assignmentRevision: parsed.data.assignment?.revision ?? null,
	};
}

export async function fetchAgentAutonomy(
	agencyId: string,
	agentId: string,
	fetchFn: AgentAutonomyFetchFn = fetch,
): Promise<Exclude<AgentAutonomyView, { kind: "loading" }>> {
	let response: Response;
	try {
		response = await fetchFn(agentAutonomyUrl(agencyId, agentId), {
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

	return autonomyViewFromResponse(response.status, body);
}

export async function fetchAgentsAutonomy(
	agencyId: string,
	agentIds: readonly string[],
	fetchFn: AgentAutonomyFetchFn = fetch,
): Promise<Record<string, Exclude<AgentAutonomyView, { kind: "loading" }>>> {
	const entries = await Promise.all(
		agentIds.map(async (agentId) => {
			const view = await fetchAgentAutonomy(agencyId, agentId, fetchFn);
			return [agentId, view] as const;
		}),
	);
	return Object.fromEntries(entries);
}

export function autonomyDisplayLabel(
	view: Exclude<AgentAutonomyView, { kind: "loading" }>,
): string {
	switch (view.kind) {
		case "ready":
			return view.assignmentStatus
				? `${view.level} · ${view.assignmentStatus}`
				: view.level;
		case "unassigned":
			return "sem nível atribuído";
		case "denied":
			return `consulta negada (HTTP ${String(view.status)})`;
		case "stale":
			return view.status === null
				? "autonomia indisponível"
				: `autonomia indisponível (HTTP ${String(view.status)})`;
		default: {
			const _exhaustive: never = view;
			return _exhaustive;
		}
	}
}
