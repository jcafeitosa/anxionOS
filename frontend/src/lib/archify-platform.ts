/**
 * Canonical platform diagram from
 * `.archify/specs/anxionos-platform.architecture.json`.
 * Does not invent modules: the 23 contexts remain one authored node.
 */

export type ArchifyNodeType =
	| "frontend"
	| "backend"
	| "database"
	| "messagebus"
	| "external";

export interface ArchifyPlatformNode {
	id: string;
	type: ArchifyNodeType;
	label: string;
	sublabel: string;
	tag?: string;
	pos: readonly [number, number];
	size: readonly [number, number];
}

export interface ArchifyPlatformEdge {
	id: string;
	from: string;
	to: string;
	label?: string;
	variant?: "emphasis" | "dashed";
}

export interface ArchifyGuidedView {
	id: string;
	label: string;
	focus: readonly string[];
	note: string;
}

export interface ArchifyInfoCard {
	title: string;
	items: readonly string[];
	tone: "ok" | "repo";
}

export const ARCHIFY_VIEWBOX = { width: 1300, height: 588 } as const;

export const ARCHIFY_PLATFORM_NODES: readonly ArchifyPlatformNode[] = [
	{
		id: "brain",
		type: "external",
		label: "brain/",
		sublabel: "OKF local",
		tag: "gitignored",
		pos: [40, 80],
		size: [120, 60],
	},
	{
		id: "actors",
		type: "external",
		label: "Humanos",
		sublabel: "Owner · papéis",
		pos: [40, 280],
		size: [120, 60],
	},
	{
		id: "frontend",
		type: "frontend",
		label: "Consoles",
		sublabel: "Astro + React",
		tag: "frontend/",
		pos: [210, 280],
		size: [130, 60],
	},
	{
		id: "api",
		type: "backend",
		label: "API",
		sublabel: "Bun + Elysia",
		tag: "apps/api",
		pos: [390, 280],
		size: [130, 60],
	},
	{
		id: "workers",
		type: "backend",
		label: "Workers",
		sublabel: "TypeScript",
		tag: "apps/workers",
		pos: [960, 440],
		size: [130, 60],
	},
	{
		id: "modules",
		type: "backend",
		label: "Módulos",
		sublabel: "23 contexts",
		tag: "ADR0002",
		pos: [570, 280],
		size: [130, 60],
	},
	{
		id: "graph",
		type: "database",
		label: "Neo4j",
		sublabel: "projeção",
		tag: "Kernel",
		pos: [770, 80],
		size: [130, 60],
	},
	{
		id: "postgres",
		type: "database",
		label: "PostgreSQL",
		sublabel: "TS · pgvector",
		tag: "ADR0004",
		pos: [570, 440],
		size: [130, 60],
	},
	{
		id: "eventing",
		type: "messagebus",
		label: "Eventing",
		sublabel: "outbox · NATS",
		pos: [770, 440],
		size: [130, 60],
	},
	{
		id: "connections",
		type: "backend",
		label: "Connections",
		sublabel: "LLM · venues",
		pos: [960, 280],
		size: [130, 60],
	},
	{
		id: "providers",
		type: "external",
		label: "Providers",
		sublabel: "externos",
		pos: [1140, 280],
		size: [120, 60],
	},
];

export const ARCHIFY_PLATFORM_EDGES: readonly ArchifyPlatformEdge[] = [
	{
		id: "actors-to-frontend",
		from: "actors",
		to: "frontend",
		label: "HTTPS",
		variant: "emphasis",
	},
	{ id: "frontend-to-api", from: "frontend", to: "api", label: "/api" },
	{ id: "api-to-modules", from: "api", to: "modules", label: "commands" },
	{
		id: "workers-to-eventing",
		from: "workers",
		to: "eventing",
		variant: "dashed",
	},
	{
		id: "modules-to-graph",
		from: "modules",
		to: "graph",
		label: "projections",
	},
	{
		id: "modules-to-postgres",
		from: "modules",
		to: "postgres",
		label: "journal",
	},
	{ id: "modules-to-eventing", from: "modules", to: "eventing" },
	{
		id: "modules-to-connections",
		from: "modules",
		to: "connections",
		label: "inference",
	},
	{ id: "connections-to-providers", from: "connections", to: "providers" },
	{
		id: "brain-to-actors",
		from: "brain",
		to: "actors",
		variant: "dashed",
	},
];

export const ARCHIFY_GUIDED_VIEWS: readonly ArchifyGuidedView[] = [
	{
		id: "request-path",
		label: "Caminho principal",
		focus: ["actors", "frontend", "api", "modules", "postgres", "graph"],
		note: "Consoles Astro até domínio, PostgreSQL autoritativo e projeção Neo4j.",
	},
	{
		id: "inference-path",
		label: "Inferência",
		focus: ["modules", "connections", "providers"],
		note: "Connections é o dono de inferência; providers externos não escrevem o ledger.",
	},
];

export const ARCHIFY_INFO_CARDS: readonly ArchifyInfoCard[] = [
	{
		title: "Fontes OpenKnowledge",
		tone: "ok",
		items: [
			"ADR0002 aceito — 23 módulos; tools ainda proposta (ADR0003)",
			"ADR0004 aceito — Neo4j + PostgreSQL/Timescale/pgvector",
			"ADR0001 proposto — grafo operacional sem ser ledger",
		],
	},
	{
		title: "Evidência no repo",
		tone: "repo",
		items: [
			"Esqueleto em backend/modules (23 donos + adapter-gateway fora do baseline)",
			"frontend/ Astro; API Bun+Elysia; eventing/database packages",
			"Implantação de produção não verificada",
		],
	},
];

export const ARCHIFY_KIND_LABEL: Record<ArchifyNodeType, string> = {
	frontend: "Frontend",
	backend: "Backend",
	database: "Database",
	messagebus: "Message bus",
	external: "External",
};

export type ArchifyViewSelection = "all" | (typeof ARCHIFY_GUIDED_VIEWS)[number]["id"];

export function nodeById(id: string): ArchifyPlatformNode | undefined {
	return ARCHIFY_PLATFORM_NODES.find((node) => node.id === id);
}

export function nodeCenter(node: ArchifyPlatformNode): { x: number; y: number } {
	return {
		x: node.pos[0] + node.size[0] / 2,
		y: node.pos[1] + node.size[1] / 2,
	};
}

export function focusedNodeIds(view: ArchifyViewSelection): ReadonlySet<string> {
	if (view === "all") {
		return new Set(ARCHIFY_PLATFORM_NODES.map((node) => node.id));
	}
	const guided = ARCHIFY_GUIDED_VIEWS.find((item) => item.id === view);
	return new Set(guided?.focus ?? []);
}

export function edgesForNodes(
	ids: ReadonlySet<string>,
): readonly ArchifyPlatformEdge[] {
	return ARCHIFY_PLATFORM_EDGES.filter(
		(edge) => ids.has(edge.from) && ids.has(edge.to),
	);
}

export function relationsFor(nodeId: string): {
	outgoing: readonly ArchifyPlatformEdge[];
	incoming: readonly ArchifyPlatformEdge[];
} {
	return {
		outgoing: ARCHIFY_PLATFORM_EDGES.filter((edge) => edge.from === nodeId),
		incoming: ARCHIFY_PLATFORM_EDGES.filter((edge) => edge.to === nodeId),
	};
}
