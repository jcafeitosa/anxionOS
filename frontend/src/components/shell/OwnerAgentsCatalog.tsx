import { useEffect, useState } from "react";
import {
	catalogEmptyDescription,
	fetchAgencyAgentsCatalog,
	type AgencyAgentsCatalogView,
} from "../../lib/agency-agents-catalog";
import { HonestState } from "./HonestState";

interface OwnerAgentsCatalogProps {
	agencyId: string;
}

export function OwnerAgentsCatalog({ agencyId }: OwnerAgentsCatalogProps) {
	const [view, setView] = useState<AgencyAgentsCatalogView>({ kind: "loading" });

	useEffect(() => {
		let cancelled = false;
		setView({ kind: "loading" });
		fetchAgencyAgentsCatalog(agencyId).then((next) => {
			if (!cancelled) {
				setView(next);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [agencyId]);

	return (
		<section aria-labelledby="owner-agents-heading" data-testid="owner-agents-catalog">
			<h2
				id="owner-agents-heading"
				className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
			>
				Agentes da agência
			</h2>
			{view.kind === "loading" ? (
				<HonestState
					kind="loading"
					titleAs="h3"
					title="Consultando agentes"
					description="GET /v1/agencies/:agencyId/agents com a sessão do membership."
				/>
			) : null}
			{view.kind === "denied" ? (
				<HonestState
					kind="denied"
					titleAs="h3"
					title="Catálogo de agentes negado"
					description={`HTTP ${String(view.status)}. O Owner console não inventa lista local.`}
				/>
			) : null}
			{view.kind === "stale" ? (
				<HonestState
					kind="stale"
					titleAs="h3"
					title="Catálogo de agentes indisponível"
					description="A resposta não pôde ser interpretada como lista de agentes. Nenhum DTO é inventado."
				/>
			) : null}
			{view.kind === "empty" ? (
				<HonestState
					kind="empty"
					titleAs="h3"
					title={
						view.reason === "no_agents"
							? "Nenhum agente nesta agência"
							: "Listagem de agentes ainda não publicada"
					}
					description={catalogEmptyDescription(view.reason)}
				/>
			) : null}
			{view.kind === "ready" ? (
				<ul className="flex flex-col gap-2" data-testid="owner-agents-list">
					{view.items.map((agent) => (
						<li
							key={agent.id}
							className="min-h-11 rounded-lg border border-border bg-surface px-4 py-3"
						>
							<p className="font-medium text-foreground">{agent.displayName}</p>
							<p className="font-mono text-xs text-muted-foreground">
								{agent.kind} · {agent.status} · {agent.id}
							</p>
						</li>
					))}
				</ul>
			) : null}
		</section>
	);
}
