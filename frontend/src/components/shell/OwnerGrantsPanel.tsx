import { useEffect, useState } from "react";
import {
	AUTONOMY_PER_AGENT_CONTRACT,
	fetchAgencyGrants,
	grantDisplayLabel,
	grantEmptyDescription,
	type AgencyGrantsView,
} from "../../lib/owner-grants";
import { HonestState } from "./HonestState";

interface OwnerGrantsPanelProps {
	agencyId: string;
}

export function OwnerGrantsPanel({ agencyId }: OwnerGrantsPanelProps) {
	const [view, setView] = useState<AgencyGrantsView>({ kind: "loading" });

	useEffect(() => {
		let cancelled = false;
		setView({ kind: "loading" });
		fetchAgencyGrants(agencyId).then((next) => {
			if (!cancelled) {
				setView(next);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [agencyId]);

	return (
		<section
			aria-labelledby="owner-grants-heading"
			data-testid="owner-grants-panel"
			id="grants"
		>
			<h2
				id="owner-grants-heading"
				className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
			>
				Grants e autonomia
			</h2>
			{view.kind === "loading" ? (
				<HonestState
					kind="loading"
					titleAs="h3"
					title="Consultando grants"
					description="GET /v1/agencies/:agencyId/grants com a sessão do membership. Autonomia por agente exige agentId — nenhum nível L0–L4 é inventado."
				/>
			) : null}
			{view.kind === "denied" ? (
				<HonestState
					kind="denied"
					titleAs="h3"
					title="Listagem de grants negada"
					description={`HTTP ${String(view.status)}. O Owner console não inventa grants locais.`}
				/>
			) : null}
			{view.kind === "stale" ? (
				<HonestState
					kind="stale"
					titleAs="h3"
					title="Grants indisponíveis"
					description="A resposta não pôde ser interpretada como lista de grants. Nenhum DTO é inventado."
				/>
			) : null}
			{view.kind === "empty" ? (
				<HonestState
					kind="empty"
					titleAs="h3"
					title={
						view.reason === "no_grants"
							? "Nenhum grant efetivo nesta agência"
							: "Listagem de grants ainda não publicada"
					}
					description={grantEmptyDescription(view.reason)}
				/>
			) : null}
			{view.kind === "ready" ? (
				<ul className="flex flex-col gap-2" data-testid="owner-grants-list">
					{view.items.map((grant) => (
						<li
							key={grant.id}
							className="min-h-11 rounded-lg border border-border bg-surface px-4 py-3"
						>
							<p className="font-medium text-foreground">{grantDisplayLabel(grant)}</p>
							<p className="font-mono text-xs text-muted-foreground">
								{grant.granteePrincipalId} · epoch {grant.authorityEpochAtIssue} ·{" "}
								{grant.id}
							</p>
						</li>
					))}
				</ul>
			) : null}
			<p
				className="mt-3 text-xs text-muted-foreground"
				data-testid="owner-autonomy-contract"
			>
				{AUTONOMY_PER_AGENT_CONTRACT}
			</p>
		</section>
	);
}
