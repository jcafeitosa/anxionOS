import { useEffect, useState } from "react";
import {
	fetchAgencyReconciliationCases,
	reconciliationDisplayLabel,
	reconciliationEmptyDescription,
	RECONCILIATION_COLLECTION_CONTRACT,
	type AgencyReconciliationView,
} from "../../lib/operator-reconciliation";
import { HonestState } from "./HonestState";

interface OperatorReconciliationPanelProps {
	agencyId: string;
}

export function OperatorReconciliationPanel({
	agencyId,
}: OperatorReconciliationPanelProps) {
	const [view, setView] = useState<AgencyReconciliationView>({ kind: "loading" });

	useEffect(() => {
		let cancelled = false;
		setView({ kind: "loading" });
		fetchAgencyReconciliationCases(agencyId).then((next) => {
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
			aria-labelledby="operator-reconciliation-heading"
			data-testid="operator-reconciliation-panel"
		>
			<h2
				id="operator-reconciliation-heading"
				className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
			>
				Reconciliação venue
			</h2>
			<p
				className="mb-4 font-mono text-xs text-muted-foreground"
				data-testid="operator-reconciliation-contract"
			>
				{RECONCILIATION_COLLECTION_CONTRACT}
			</p>
			{view.kind === "loading" ? (
				<HonestState
					kind="loading"
					titleAs="h3"
					title="Consultando casos de reconciliação"
					description="GET /v1/execution/agencies/:agencyId/reconciliation-cases com a sessão do membership. Nenhum caso é inventado."
				/>
			) : null}
			{view.kind === "denied" ? (
				<HonestState
					kind="denied"
					titleAs="h3"
					title="Listagem de reconciliação negada"
					description={`HTTP ${String(view.status)}. O Operator console não inventa casos locais.`}
				/>
			) : null}
			{view.kind === "stale" ? (
				<HonestState
					kind="stale"
					titleAs="h3"
					title="Reconciliação indisponível"
					description="A resposta não pôde ser interpretada como fila de casos. Nenhum DTO é inventado."
				/>
			) : null}
			{view.kind === "empty" ? (
				<HonestState
					kind="empty"
					titleAs="h3"
					title={
						view.reason === "no_cases"
							? "Nenhum caso de reconciliação"
							: "Listagem de reconciliação ainda não publicada"
					}
					description={reconciliationEmptyDescription(view.reason)}
				/>
			) : null}
			{view.kind === "ready" ? (
				<ul
					className="flex flex-col gap-2"
					data-testid="operator-reconciliation-list"
				>
					{view.items.map((caseItem) => (
						<li
							key={caseItem.reconciliationCaseId}
							className="min-h-11 rounded-lg border border-border bg-surface px-4 py-3"
							data-testid="operator-reconciliation-item"
							data-reconciliation-case-id={caseItem.reconciliationCaseId}
						>
							<p className="font-medium text-foreground">
								{reconciliationDisplayLabel(caseItem)}
							</p>
							<p className="font-mono text-xs text-muted-foreground">
								{caseItem.venueAdapterRefId}
								{caseItem.orderId ? ` · order ${caseItem.orderId}` : ""}
								{caseItem.venueFillId ? ` · venueFill ${caseItem.venueFillId}` : ""}
								{caseItem.disposition ? ` · ${caseItem.disposition}` : ""}
							</p>
						</li>
					))}
				</ul>
			) : null}
		</section>
	);
}
