import { useEffect, useState } from "react";
import {
	fetchPlatformHealth,
	platformHealthEmptyDescription,
	type PlatformHealthView,
} from "../../lib/platform-health";
import {
	fetchPlatformIncidents,
	platformIncidentsEmptyDescription,
	type PlatformIncidentsView,
} from "../../lib/platform-incidents";
import { HonestState } from "./HonestState";

interface PlatformDashboardProps {
	platformAccess: boolean;
}

/**
 * ANX-166 P07 — Platform Console.
 * Escopo PLATFORM explícito: nenhum agencyId, nenhum GET /v1/agencies/*.
 */
export function PlatformDashboard({ platformAccess }: PlatformDashboardProps) {
	if (!platformAccess) {
		return (
			<section
				aria-labelledby="platform-access-heading"
				data-testid="platform-dashboard-denied"
			>
				<h2
					id="platform-access-heading"
					className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
				>
					Operação da plataforma
				</h2>
				<HonestState
					kind="denied"
					titleAs="h3"
					title="Acesso PLATFORM negado"
					description="O loader não autorizou este principal para o console de plataforma (grant console.platform ausente)."
				/>
			</section>
		);
	}

	return (
		<div className="flex flex-col gap-8" data-testid="platform-dashboard">
			<PlatformHealthSection />
			<PlatformIncidentsSection />
			<section aria-labelledby="platform-runtime-heading" id="runtimes">
				<h2
					id="platform-runtime-heading"
					className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
				>
					Runtimes e quotas
				</h2>
				<HonestState
					kind="empty"
					titleAs="h3"
					title="Runtimes e quotas não publicados"
					description="GET /v1/operations/platform/runtimes ainda não existe. Nenhuma métrica de Agency é inventada."
				/>
			</section>
			<section aria-labelledby="platform-rollout-heading" id="rollout">
				<h2
					id="platform-rollout-heading"
					className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
				>
					Rollout e export/recovery
				</h2>
				<HonestState
					kind="empty"
					titleAs="h3"
					title="Rollout e recovery sob demanda"
					description="GET /v1/operations/platform/recovery ainda não existe. Nenhuma operação break-glass é executada neste console."
				/>
			</section>
		</div>
	);
}

function PlatformHealthSection() {
	const [view, setView] = useState<PlatformHealthView>({ kind: "loading" });

	useEffect(() => {
		let cancelled = false;
		fetchPlatformHealth().then((next) => {
			if (!cancelled) {
				setView(next);
			}
		});
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<section aria-labelledby="platform-health-heading" id="health">
			<h2
				id="platform-health-heading"
				className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
			>
				Saúde da plataforma
			</h2>
			{view.kind === "loading" ? (
				<HonestState
					kind="loading"
					titleAs="h3"
					title="Consultando health PLATFORM"
					description="GET /v1/operations/platform/health com a sessão do grant console.platform."
				/>
			) : null}
			{view.kind === "denied" ? (
				<HonestState
					kind="denied"
					titleAs="h3"
					title="Health de plataforma negado"
					description={`HTTP ${String(view.status)}. Sem grant console.platform o console não inventa status.`}
				/>
			) : null}
			{view.kind === "stale" ? (
				<HonestState
					kind="stale"
					titleAs="h3"
					title="Health indisponível"
					description="A resposta não pôde ser interpretada como snapshot de probe. Nenhum DTO é inventado."
				/>
			) : null}
			{view.kind === "empty" ? (
				<HonestState
					kind="empty"
					titleAs="h3"
					title="Health ainda não publicado"
					description={platformHealthEmptyDescription()}
				/>
			) : null}
			{view.kind === "ready" ? (
				<dl
					className="grid gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm"
					data-testid="platform-health-snapshot"
				>
					<div>
						<dt className="text-muted-foreground">source</dt>
						<dd className="font-mono text-foreground">{view.snapshot.source}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">checkedAt</dt>
						<dd className="font-mono text-foreground">
							{view.snapshot.checkedAt}
						</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">stale</dt>
						<dd className="font-mono text-foreground">
							{String(view.snapshot.stale)}
						</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">postgres</dt>
						<dd className="font-mono text-foreground">
							{view.snapshot.deps.postgres}
						</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">nats</dt>
						<dd className="font-mono text-foreground">{view.snapshot.deps.nats}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">neo4j</dt>
						<dd className="font-mono text-foreground">
							{view.snapshot.deps.neo4j}
						</dd>
					</div>
				</dl>
			) : null}
		</section>
	);
}

function PlatformIncidentsSection() {
	const [view, setView] = useState<PlatformIncidentsView>({ kind: "loading" });

	useEffect(() => {
		let cancelled = false;
		fetchPlatformIncidents().then((next) => {
			if (!cancelled) {
				setView(next);
			}
		});
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<section aria-labelledby="platform-incidents-heading" id="incidents">
			<h2
				id="platform-incidents-heading"
				className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
			>
				Incidentes de plataforma
			</h2>
			{view.kind === "loading" ? (
				<HonestState
					kind="loading"
					titleAs="h3"
					title="Consultando incidentes PLATFORM"
					description="GET /v1/operations/platform/incidents. Não lista incidentes de Agency."
				/>
			) : null}
			{view.kind === "denied" ? (
				<HonestState
					kind="denied"
					titleAs="h3"
					title="Incidentes de plataforma negados"
					description={`HTTP ${String(view.status)}. O console não inventa fila de incidentes.`}
				/>
			) : null}
			{view.kind === "stale" ? (
				<HonestState
					kind="stale"
					titleAs="h3"
					title="Incidentes indisponíveis"
					description="A resposta não pôde ser interpretada como coleção de plataforma."
				/>
			) : null}
			{view.kind === "empty" ? (
				<HonestState
					kind="empty"
					titleAs="h3"
					title={
						view.reason === "no_incidents"
							? "Nenhum incidente de plataforma"
							: "Listagem de plataforma ainda não publicada"
					}
					description={platformIncidentsEmptyDescription(view.reason)}
				/>
			) : null}
			{view.kind === "ready" ? (
				<p
					className="text-sm text-foreground"
					data-testid="platform-incidents-count"
				>
					{view.count} incidente(s) de plataforma (ledger PLATFORM, sem Agency).
				</p>
			) : null}
		</section>
	);
}
