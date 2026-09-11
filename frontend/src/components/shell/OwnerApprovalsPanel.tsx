import { useEffect, useState } from "react";
import {
	APPROVAL_RESOLVE_CONTRACT,
	approvalDisplayLabel,
	approvalEmptyDescription,
	fetchAgencyChangeProposals,
	type AgencyApprovalsView,
} from "../../lib/owner-approvals";
import { HonestState } from "./HonestState";

interface OwnerApprovalsPanelProps {
	agencyId: string;
}

export function OwnerApprovalsPanel({ agencyId }: OwnerApprovalsPanelProps) {
	const [view, setView] = useState<AgencyApprovalsView>({ kind: "loading" });

	useEffect(() => {
		let cancelled = false;
		setView({ kind: "loading" });
		fetchAgencyChangeProposals(agencyId).then((next) => {
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
			aria-labelledby="owner-approvals-heading"
			data-testid="owner-approvals-panel"
			id="approvals"
		>
			<h2
				id="owner-approvals-heading"
				className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
			>
				Fila de aprovações
			</h2>
			{view.kind === "loading" ? (
				<HonestState
					kind="loading"
					titleAs="h3"
					title="Consultando propostas pendentes"
					description="GET /v1/agencies/:agencyId/change-proposals com a sessão do membership. Nenhuma aprovação é inventada."
				/>
			) : null}
			{view.kind === "denied" ? (
				<HonestState
					kind="denied"
					titleAs="h3"
					title="Fila de aprovações negada"
					description={`HTTP ${String(view.status)}. O Owner console não inventa ChangeProposals locais.`}
				/>
			) : null}
			{view.kind === "stale" ? (
				<HonestState
					kind="stale"
					titleAs="h3"
					title="Aprovações indisponíveis"
					description="A resposta não pôde ser interpretada como fila de ChangeProposals. Nenhum DTO é inventado."
				/>
			) : null}
			{view.kind === "empty" ? (
				<HonestState
					kind="empty"
					titleAs="h3"
					title={
						view.reason === "no_pending"
							? "Nenhuma ChangeProposal pendente"
							: "Listagem de aprovações ainda não publicada"
					}
					description={approvalEmptyDescription(view.reason)}
				/>
			) : null}
			{view.kind === "ready" ? (
				<ul className="flex flex-col gap-2" data-testid="owner-approvals-list">
					{view.items.map((proposal) => (
						<li
							key={proposal.id}
							className="min-h-11 rounded-lg border border-border bg-surface px-4 py-3"
						>
							<p className="font-medium text-foreground">
								{approvalDisplayLabel(proposal)}
							</p>
							<p className="font-mono text-xs text-muted-foreground">
								{proposal.proposerPrincipalId} · rev {proposal.revision} ·{" "}
								{proposal.id}
							</p>
						</li>
					))}
				</ul>
			) : null}
			<p
				className="mt-3 text-xs text-muted-foreground"
				data-testid="owner-approval-resolve-contract"
			>
				{APPROVAL_RESOLVE_CONTRACT}
			</p>
		</section>
	);
}
