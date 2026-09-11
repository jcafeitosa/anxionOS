import { useEffect, useState } from "react";
import {
	FINANCE_COLLECTION_CONTRACT,
	fetchAgencyFinanceOverview,
	financeEmptyDescription,
	type AgencyFinanceView,
	portfolioDisplayLabel,
	valuationDisplayLabel,
} from "../../lib/owner-finance";
import { HonestState } from "./HonestState";

interface OwnerFinancePanelProps {
	agencyId: string;
}

export function OwnerFinancePanel({ agencyId }: OwnerFinancePanelProps) {
	const [view, setView] = useState<AgencyFinanceView>({ kind: "loading" });

	useEffect(() => {
		let cancelled = false;
		setView({ kind: "loading" });
		fetchAgencyFinanceOverview(agencyId).then((next) => {
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
			aria-labelledby="owner-finance-heading"
			data-testid="owner-finance-panel"
			id="finance"
		>
			<h2
				id="owner-finance-heading"
				className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
			>
				Portfólio e valuation
			</h2>
			{view.kind === "loading" ? (
				<HonestState
					kind="loading"
					titleAs="h3"
					title="Consultando portfólios"
					description="GET /v1/agencies/:agencyId/portfolios com a sessão do membership. Nenhum NAV é inventado."
				/>
			) : null}
			{view.kind === "denied" ? (
				<HonestState
					kind="denied"
					titleAs="h3"
					title="Visão financeira negada"
					description={`HTTP ${String(view.status)}. O Owner console não inventa posições ou valuation locais.`}
				/>
			) : null}
			{view.kind === "stale" ? (
				<HonestState
					kind="stale"
					titleAs="h3"
					title="Visão financeira indisponível"
					description="A resposta não pôde ser interpretada como overview de portfólios. Nenhum DTO é inventado."
				/>
			) : null}
			{view.kind === "empty" ? (
				<HonestState
					kind="empty"
					titleAs="h3"
					title={
						view.reason === "no_portfolios"
							? "Nenhum portfólio nesta agência"
							: "Listagem de portfólios ainda não publicada"
					}
					description={financeEmptyDescription(view.reason)}
				/>
			) : null}
			{view.kind === "ready" ? (
				<ul className="flex flex-col gap-2" data-testid="owner-finance-list">
					{view.items.map((portfolio) => (
						<li
							key={portfolio.id}
							className="min-h-11 rounded-lg border border-border bg-surface px-4 py-3"
						>
							<p className="font-medium text-foreground">
								{portfolioDisplayLabel(portfolio)}
							</p>
							<p className="font-mono text-xs text-muted-foreground">
								{portfolio.executionMode} · {portfolio.status} · {portfolio.id}
							</p>
							{portfolio.latestValuation ? (
								<p
									className="mt-1 text-xs text-muted-foreground"
									data-testid={`owner-finance-valuation-${portfolio.id}`}
								>
									Valuation:{" "}
									{valuationDisplayLabel(
										portfolio.latestValuation,
										portfolio.baseCurrency,
									)}
								</p>
							) : (
								<p
									className="mt-1 text-xs text-muted-foreground"
									data-testid={`owner-finance-valuation-${portfolio.id}`}
								>
									Valuation: ausente — confirmValuation ainda não emitiu snapshot
									para este portfólio.
								</p>
							)}
						</li>
					))}
				</ul>
			) : null}
			<p
				className="mt-3 text-xs text-muted-foreground"
				data-testid="owner-finance-contract"
			>
				{FINANCE_COLLECTION_CONTRACT}
			</p>
		</section>
	);
}
