import { Minus, Plus, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
	ARCHIFY_GUIDED_VIEWS,
	ARCHIFY_INFO_CARDS,
	ARCHIFY_KIND_LABEL,
	ARCHIFY_PLATFORM_NODES,
	ARCHIFY_VIEWBOX,
	edgesForNodes,
	focusedNodeIds,
	nodeById,
	nodeCenter,
	relationsFor,
	type ArchifyNodeType,
	type ArchifyViewSelection,
} from "../../lib/archify-platform";

interface ArchifyCanvasProps {
	title: string;
	defaultSelectedId?: string;
	passport: (args: {
		selectedId: string;
		nodeLabel: string;
		kindLabel: string;
	}) => ReactNode;
	footer?: ReactNode;
	testId?: string;
}

const ZOOM_STEPS = [0.75, 1, 1.25] as const;

const NODE_STROKE: Record<ArchifyNodeType, string> = {
	frontend: "var(--color-accent-blue)",
	backend: "var(--color-accent)",
	database: "var(--color-muted-foreground)",
	messagebus: "var(--color-accent)",
	external: "var(--color-secondary)",
};

export function ArchifyCanvas({
	title,
	defaultSelectedId = "frontend",
	passport,
	footer,
	testId,
}: ArchifyCanvasProps) {
	const [view, setView] = useState<ArchifyViewSelection>("request-path");
	const [zoomIndex, setZoomIndex] = useState(1);
	const [selectedId, setSelectedId] = useState(defaultSelectedId);
	const [query, setQuery] = useState("");

	const focus = focusedNodeIds(view);
	const zoom = ZOOM_STEPS[zoomIndex];
	const selected = nodeById(selectedId) ?? ARCHIFY_PLATFORM_NODES[2];
	const relations = relationsFor(selected.id);
	const visibleEdges = edgesForNodes(focus);

	const finderNodes = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return ARCHIFY_PLATFORM_NODES.filter((node) => {
			if (!needle) {
				return true;
			}
			return (
				node.label.toLowerCase().includes(needle) ||
				node.id.toLowerCase().includes(needle) ||
				node.sublabel.toLowerCase().includes(needle)
			);
		});
	}, [query]);

	const guidedNote =
		view === "all"
			? "Diagrama completo do spec Archify — 11 nós autorados, 23 módulos como um contexto."
			: (ARCHIFY_GUIDED_VIEWS.find((item) => item.id === view)?.note ?? "");

	return (
		<div className="flex flex-col gap-6" data-testid={testId}>
			<div
				className="flex flex-wrap items-center gap-2"
				role="toolbar"
				aria-label="Ações do diagrama"
			>
				<button
					type="button"
					className={`inline-flex min-h-11 cursor-pointer items-center rounded-lg border px-3 text-sm font-medium transition-colors duration-200 ${
						view === "all"
							? "border-accent bg-secondary text-foreground"
							: "border-border bg-surface text-muted-foreground hover:bg-secondary/60"
					}`}
					aria-pressed={view === "all"}
					onClick={() => setView("all")}
				>
					Show all
				</button>
				{ARCHIFY_GUIDED_VIEWS.map((item) => (
					<button
						key={item.id}
						type="button"
						className={`inline-flex min-h-11 cursor-pointer items-center rounded-lg border px-3 text-sm font-medium transition-colors duration-200 ${
							view === item.id
								? "border-accent bg-secondary text-foreground"
								: "border-border bg-surface text-muted-foreground hover:bg-secondary/60"
						}`}
						aria-pressed={view === item.id}
						onClick={() => setView(item.id)}
					>
						{item.label}
					</button>
				))}
			</div>

			<div className="flex items-center gap-3">
				<span
					className="size-3 shrink-0 rounded-full bg-accent-blue motion-safe:animate-pulse"
					aria-hidden="true"
				/>
				<h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
					{title}
				</h2>
			</div>
			<p className="text-sm text-muted-foreground">{guidedNote}</p>

			<div className="grid gap-4 xl:grid-cols-[16rem_minmax(0,1fr)_18rem]">
				<aside className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
					<label htmlFor="archify-node-finder" className="text-sm font-medium text-foreground">
						Encontrar nó
					</label>
					<div className="relative">
						<Search
							className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
							aria-hidden="true"
						/>
						<input
							id="archify-node-finder"
							type="search"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Rótulo ou id do spec"
							className="min-h-11 w-full cursor-text rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-foreground"
						/>
					</div>
					<ul className="flex max-h-64 flex-col gap-1 overflow-y-auto" aria-label="Nós do diagrama">
						{finderNodes.map((node) => (
							<li key={node.id}>
								<button
									type="button"
									className={`flex min-h-11 w-full cursor-pointer items-center justify-between rounded-lg px-3 text-left text-sm transition-colors duration-200 ${
										selectedId === node.id
											? "bg-secondary text-foreground"
											: "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
									}`}
									aria-current={selectedId === node.id ? "true" : undefined}
									onClick={() => setSelectedId(node.id)}
								>
									<span>{node.label}</span>
									<span className="font-mono text-xs">{ARCHIFY_KIND_LABEL[node.type]}</span>
								</button>
							</li>
						))}
					</ul>
				</aside>

				<div className="relative min-h-[20rem] overflow-hidden rounded-xl border border-border bg-background-deep">
					<div
						className="archify-grid origin-center transition-transform duration-200 motion-reduce:transition-none"
						style={{ transform: `scale(${zoom})` }}
					>
						<svg
							viewBox={`0 0 ${ARCHIFY_VIEWBOX.width} ${ARCHIFY_VIEWBOX.height}`}
							role="group"
							aria-labelledby="archify-canvas-title archify-canvas-desc"
							className="h-auto w-full"
							data-testid="archify-canvas"
						>
							<title id="archify-canvas-title">{title}</title>
							<desc id="archify-canvas-desc">
								Diagrama institucional Archify classic: consoles Astro, 23 módulos,
								PostgreSQL autoritativo e Neo4j como projeção.
							</desc>
							<defs>
								<marker
									id="archify-arrow"
									markerWidth="10"
									markerHeight="7"
									refX="9"
									refY="3.5"
									orient="auto"
								>
									<polygon points="0 0, 10 3.5, 0 7" fill="var(--color-muted-foreground)" />
								</marker>
								<marker
									id="archify-arrow-emphasis"
									markerWidth="10"
									markerHeight="7"
									refX="9"
									refY="3.5"
									orient="auto"
								>
									<polygon points="0 0, 10 3.5, 0 7" fill="var(--color-accent)" />
								</marker>
							</defs>
							{visibleEdges.map((edge) => {
								const from = nodeById(edge.from);
								const to = nodeById(edge.to);
								if (!from || !to) {
									return null;
								}
								const a = nodeCenter(from);
								const b = nodeCenter(to);
								const emphasis = edge.variant === "emphasis";
								return (
									<g key={edge.id}>
										<line
											x1={a.x}
											y1={a.y}
											x2={b.x}
											y2={b.y}
											stroke={
												emphasis
													? "var(--color-accent)"
													: "var(--color-muted-foreground)"
											}
											strokeWidth={emphasis ? 2.2 : 1.4}
											strokeDasharray={edge.variant === "dashed" ? "6 6" : undefined}
											markerEnd={
												emphasis ? "url(#archify-arrow-emphasis)" : "url(#archify-arrow)"
											}
										/>
										{edge.label ? (
											<text
												x={(a.x + b.x) / 2}
												y={(a.y + b.y) / 2 - 8}
												fill="var(--color-muted-foreground)"
												fontSize="11"
												textAnchor="middle"
											>
												{edge.label}
											</text>
										) : null}
									</g>
								);
							})}
							{ARCHIFY_PLATFORM_NODES.map((node) => {
								const inFocus = focus.has(node.id);
								const selectedNode = selectedId === node.id;
								return (
									<g
										key={node.id}
										opacity={inFocus ? 1 : 0.28}
										role="button"
										tabIndex={0}
										aria-label={`${node.label}, ${ARCHIFY_KIND_LABEL[node.type]}`}
										onClick={() => setSelectedId(node.id)}
										onKeyDown={(event) => {
											if (event.key === "Enter" || event.key === " ") {
												event.preventDefault();
												setSelectedId(node.id);
											}
										}}
										className="cursor-pointer"
									>
										<rect
											x={node.pos[0]}
											y={node.pos[1]}
											width={node.size[0]}
											height={node.size[1]}
											rx={8}
											fill="var(--color-surface)"
											stroke={
												selectedNode ? "var(--color-accent)" : NODE_STROKE[node.type]
											}
											strokeWidth={selectedNode ? 2.4 : 1.6}
										/>
										<text
											x={node.pos[0] + node.size[0] / 2}
											y={node.pos[1] + 24}
											fill="var(--color-foreground)"
											fontSize="13"
											fontWeight={600}
											textAnchor="middle"
										>
											{node.label}
										</text>
										<text
											x={node.pos[0] + node.size[0] / 2}
											y={node.pos[1] + 42}
											fill="var(--color-muted-foreground)"
											fontSize="11"
											textAnchor="middle"
										>
											{node.sublabel}
										</text>
									</g>
								);
							})}
						</svg>
					</div>
					<div
						className="absolute bottom-3 left-3 flex gap-1 rounded-lg border border-border bg-surface/95 p-1"
						role="toolbar"
						aria-label="Zoom do diagrama"
					>
						<button
							type="button"
							className="flex size-11 cursor-pointer items-center justify-center rounded-md text-foreground hover:bg-secondary"
							aria-label="Diminuir zoom"
							disabled={zoomIndex === 0}
							onClick={() => setZoomIndex((value) => Math.max(0, value - 1))}
						>
							<Minus className="size-4" aria-hidden="true" />
						</button>
						<button
							type="button"
							className="inline-flex min-h-11 min-w-14 cursor-pointer items-center justify-center rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary"
							aria-label="Redefinir zoom"
							onClick={() => setZoomIndex(1)}
						>
							{Math.round(zoom * 100)}%
						</button>
						<button
							type="button"
							className="flex size-11 cursor-pointer items-center justify-center rounded-md text-foreground hover:bg-secondary"
							aria-label="Aumentar zoom"
							disabled={zoomIndex === ZOOM_STEPS.length - 1}
							onClick={() => setZoomIndex((value) => Math.min(ZOOM_STEPS.length - 1, value + 1))}
						>
							<Plus className="size-4" aria-hidden="true" />
						</button>
					</div>
					<ul
						className="absolute bottom-3 right-3 flex flex-wrap gap-2 rounded-lg border border-border bg-surface/95 px-3 py-2 text-xs"
						aria-label="Legenda semântica"
					>
						{(Object.keys(ARCHIFY_KIND_LABEL) as ArchifyNodeType[]).map((kind) => (
							<li key={kind} className="flex items-center gap-2 text-muted-foreground">
								<span
									className="size-2.5 rounded-sm border"
									style={{ borderColor: NODE_STROKE[kind], background: NODE_STROKE[kind] }}
									aria-hidden="true"
								/>
								{ARCHIFY_KIND_LABEL[kind]}
							</li>
						))}
					</ul>
				</div>

				<aside
					className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4"
					aria-labelledby="archify-passport-heading"
				>
					<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Semantic passport
					</p>
					<h3 id="archify-passport-heading" className="text-base font-semibold text-foreground">
						{selected.label}
					</h3>
					<dl className="grid gap-2 text-xs">
						<div>
							<dt className="text-muted-foreground">tipo</dt>
							<dd className="font-mono text-foreground">{ARCHIFY_KIND_LABEL[selected.type]}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">id</dt>
							<dd className="font-mono text-foreground">{selected.id}</dd>
						</div>
						{selected.tag ? (
							<div>
								<dt className="text-muted-foreground">tag</dt>
								<dd className="font-mono text-foreground">{selected.tag}</dd>
							</div>
						) : null}
					</dl>
					<div>
						<p className="text-xs font-medium text-muted-foreground">Relações autoradas</p>
						<ul className="mt-2 grid gap-1 text-xs text-foreground">
							{relations.outgoing.map((edge) => (
								<li key={edge.id}>
									OUT → {nodeById(edge.to)?.label}
									{edge.label ? ` · ${edge.label}` : ""}
								</li>
							))}
							{relations.incoming.map((edge) => (
								<li key={edge.id}>
									IN ← {nodeById(edge.from)?.label}
									{edge.label ? ` · ${edge.label}` : ""}
								</li>
							))}
						</ul>
					</div>
					{passport({
						selectedId: selected.id,
						nodeLabel: selected.label,
						kindLabel: ARCHIFY_KIND_LABEL[selected.type],
					})}
				</aside>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				{ARCHIFY_INFO_CARDS.map((card) => (
					<article
						key={card.title}
						className="rounded-xl border border-border bg-surface p-5"
					>
						<header className="mb-3 flex items-center gap-2">
							<span
								className={
									card.tone === "ok"
										? "size-2.5 rounded-full bg-accent-blue"
										: "size-2.5 rounded-full bg-accent"
								}
								aria-hidden="true"
							/>
							<h3 className="text-sm font-semibold text-foreground">{card.title}</h3>
						</header>
						<ul className="grid gap-2 text-sm text-muted-foreground">
							{card.items.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
					</article>
				))}
			</div>

			{footer}
		</div>
	);
}
