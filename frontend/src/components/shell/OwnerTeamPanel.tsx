import { useEffect, useState } from "react";
import {
	fetchAgencyMemberships,
	MEMBERSHIPS_COLLECTION_CONTRACT,
	membershipDisplayLabel,
	membershipEmptyDescription,
	type AgencyMembershipsView,
} from "../../lib/owner-memberships";
import { HonestState } from "./HonestState";

interface OwnerTeamPanelProps {
	agencyId: string;
}

export function OwnerTeamPanel({ agencyId }: OwnerTeamPanelProps) {
	const [view, setView] = useState<AgencyMembershipsView>({ kind: "loading" });

	useEffect(() => {
		let cancelled = false;
		setView({ kind: "loading" });
		fetchAgencyMemberships(agencyId).then((next) => {
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
			aria-labelledby="owner-team-heading"
			data-testid="owner-team-panel"
			id="team"
		>
			<h2
				id="owner-team-heading"
				className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
			>
				Equipe
			</h2>
			{view.kind === "loading" ? (
				<HonestState
					kind="loading"
					titleAs="h3"
					title="Consultando equipe"
					description="GET /v1/organizations/agencies/:agencyId/memberships com a sessão do membership."
				/>
			) : null}
			{view.kind === "denied" ? (
				<HonestState
					kind="denied"
					titleAs="h3"
					title="Listagem de equipe negada"
					description={`HTTP ${String(view.status)}. O Owner console não inventa teammates locais.`}
				/>
			) : null}
			{view.kind === "stale" ? (
				<HonestState
					kind="stale"
					titleAs="h3"
					title="Equipe indisponível"
					description="A resposta não pôde ser interpretada como lista de memberships. Nenhum DTO é inventado."
				/>
			) : null}
			{view.kind === "empty" ? (
				<HonestState
					kind="empty"
					titleAs="h3"
					title={
						view.reason === "no_members"
							? "Nenhum membro nesta agência"
							: "Listagem de equipe ainda não publicada"
					}
					description={membershipEmptyDescription(view.reason)}
				/>
			) : null}
			{view.kind === "ready" ? (
				<ul className="flex flex-col gap-2" data-testid="owner-team-list">
					{view.items.map((member) => (
						<li
							key={member.id}
							className="min-h-11 rounded-lg border border-border bg-surface px-4 py-3"
						>
							<p className="font-medium text-foreground">
								{member.role} · {member.status}
							</p>
							<p className="font-mono text-xs text-muted-foreground">
								{membershipDisplayLabel(member)} · {member.id}
							</p>
						</li>
					))}
				</ul>
			) : null}
			<p
				className="mt-3 text-xs text-muted-foreground"
				data-testid="owner-team-contract"
			>
				{MEMBERSHIPS_COLLECTION_CONTRACT}
			</p>
		</section>
	);
}
