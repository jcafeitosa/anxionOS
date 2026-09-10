import { Banknote, Handshake, Receipt, Shield } from "lucide-react";
import { useMemo, useState } from "react";
import { DashboardCard } from "../DashboardCard";
import type { PostLoginAuthContext } from "../../lib/auth";
import { paginatePartnerList } from "../../lib/partner-console";
import { usePartnerConsole } from "../../lib/usePartnerConsole";
import { HonestState } from "./HonestState";

interface PartnerDashboardProps {
	context: PostLoginAuthContext;
}

const PAGE_SIZE = 5;

export function PartnerDashboard({ context }: PartnerDashboardProps) {
	const loadState = usePartnerConsole(context);
	const [accrualPage, setAccrualPage] = useState(1);
	const [payoutPage, setPayoutPage] = useState(1);

	const accrualPageData = useMemo(() => {
		if (loadState.status !== "ready") {
			return null;
		}
		return paginatePartnerList(loadState.snapshot.accruals, accrualPage, PAGE_SIZE);
	}, [accrualPage, loadState]);

	const payoutPageData = useMemo(() => {
		if (loadState.status !== "ready") {
			return null;
		}
		return paginatePartnerList(loadState.snapshot.payouts, payoutPage, PAGE_SIZE);
	}, [loadState, payoutPage]);

	if (loadState.status === "loading") {
		return (
			<HonestState
				kind="loading"
				title="Carregando console parceiro"
				description="Consultando GET /v1/partners/organizations/:organizationId/* — sem dados locais."
			/>
		);
	}

	if (loadState.status === "unresolved") {
		return (
			<HonestState
				kind="pending"
				title={
					loadState.reason === "ambiguous_membership"
						? "Escopo de organização ambíguo"
						: "Nenhuma membership para escopo partner"
				}
				description={
					loadState.reason === "ambiguous_membership"
						? "Várias memberships ativas impedem inferir organizationId. Selecione a organização antes de abrir o console partner."
						: "post-login-context não traz agencyId único nem membership ativa para escopo da API partners."
				}
				actionHref="/select-organization"
				actionLabel="Escolher organização"
			/>
		);
	}

	if (loadState.status === "error") {
		return (
			<HonestState
				kind={loadState.honestKind}
				title="Não foi possível carregar dados do parceiro"
				description={loadState.message}
				actionHref="/login"
				actionLabel="Voltar ao login"
			/>
		);
	}

	const { snapshot } = loadState;
	const { model, partner } = snapshot;

	return (
		<div className="flex flex-col gap-8" data-testid="partner-dashboard">
			<section aria-labelledby="partner-profile-heading">
				<h2
					id="partner-profile-heading"
					className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
				>
					Perfil do parceiro (loader)
				</h2>
				<div className="grid gap-4 sm:grid-cols-2">
					<DashboardCard
						title="Organização parceira"
						description="GET /v1/partners/organizations/:organizationId"
						icon={Handshake}
						status={partner.status === "ACTIVE" ? "online" : "offline"}
						statusLabel={partner.status}
					>
						<dl className="grid gap-2 text-xs" data-testid="partner-organization">
							<div>
								<dt className="text-muted-foreground">organizationId</dt>
								<dd className="break-all font-mono text-foreground">
									{model.organizationId}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">displayName</dt>
								<dd className="font-mono text-foreground">{partner.displayName}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">referralCode</dt>
								<dd className="font-mono text-foreground">{partner.referralCode}</dd>
							</div>
						</dl>
					</DashboardCard>
					<DashboardCard
						title="Comissão configurada"
						description="Taxa decimal string do contrato partners — sem ledger direto neste console."
						icon={Shield}
						status="online"
						statusLabel={`${partner.commissionRate}%`}
					>
						<p className="text-sm" data-testid="partner-commission-rate">
							Comissão {partner.commissionRate}% sobre faturas da organização referida (
							<span className="font-mono">{partner.referredOrganizationId}</span>).
						</p>
					</DashboardCard>
				</div>
			</section>

			<section aria-labelledby="partner-accruals-heading" id="activity">
				<h2
					id="partner-accruals-heading"
					className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
				>
					Accruals de comissão
				</h2>
				{model.accrualCount === 0 ? (
					<HonestState
						kind="empty"
						title="Nenhum accrual registrado"
						description="GET /commission-accruals retornou lista vazia — estado autoritativo, não placeholder."
					/>
				) : (
					<div className="flex flex-col gap-4">
						<DashboardCard
							title={`${model.accrualCount} accrual(s)`}
							description={`Total ACCRUED: ${model.accrualsTotalAmount} (soma local das linhas carregadas).`}
							icon={Receipt}
							status="online"
							statusLabel="API"
						>
							<ul className="flex flex-col gap-2 text-xs" data-testid="partner-accruals-list">
								{accrualPageData?.items.map((row) => (
									<li
										key={row.id}
										className="rounded-lg border border-border px-3 py-2 font-mono text-foreground"
									>
										{row.invoiceId} · {row.commissionAmount} · {row.status}
									</li>
								))}
							</ul>
						</DashboardCard>
						{model.accrualCount > PAGE_SIZE ? (
							<div className="flex items-center gap-3">
								<button
									type="button"
									className="min-h-11 rounded-lg border border-border px-3 text-sm disabled:opacity-50"
									disabled={accrualPage <= 1}
									onClick={() => setAccrualPage((page) => Math.max(1, page - 1))}
								>
									Anterior
								</button>
								<span className="text-xs text-muted-foreground">
									Página {accrualPage}
								</span>
								<button
									type="button"
									className="min-h-11 rounded-lg border border-border px-3 text-sm disabled:opacity-50"
									disabled={!accrualPageData?.hasMore}
									onClick={() => setAccrualPage((page) => page + 1)}
								>
									Próxima
								</button>
							</div>
						) : null}
					</div>
				)}
			</section>

			<section aria-labelledby="partner-payouts-heading" id="settings">
				<h2
					id="partner-payouts-heading"
					className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
				>
					Payouts
				</h2>
				{model.payoutCount === 0 ? (
					<HonestState
						kind="empty"
						title="Nenhum payout registrado"
						description="GET /payouts retornou lista vazia."
					/>
				) : (
					<div className="flex flex-col gap-4">
						<DashboardCard
							title={`${model.payoutCount} payout(s)`}
							description={`Total solicitado carregado: ${model.payoutsRequestedTotal}.`}
							icon={Banknote}
							status="online"
							statusLabel="API"
						>
							<ul className="flex flex-col gap-2 text-xs" data-testid="partner-payouts-list">
								{payoutPageData?.items.map((row) => (
									<li
										key={row.id}
										className="rounded-lg border border-border px-3 py-2 font-mono text-foreground"
									>
										{row.requestedAmount} · {row.status} · {row.requestedAt}
									</li>
								))}
							</ul>
						</DashboardCard>
						{model.payoutCount > PAGE_SIZE ? (
							<div className="flex items-center gap-3">
								<button
									type="button"
									className="min-h-11 rounded-lg border border-border px-3 text-sm disabled:opacity-50"
									disabled={payoutPage <= 1}
									onClick={() => setPayoutPage((page) => Math.max(1, page - 1))}
								>
									Anterior
								</button>
								<span className="text-xs text-muted-foreground">Página {payoutPage}</span>
								<button
									type="button"
									className="min-h-11 rounded-lg border border-border px-3 text-sm disabled:opacity-50"
									disabled={!payoutPageData?.hasMore}
									onClick={() => setPayoutPage((page) => page + 1)}
								>
									Próxima
								</button>
							</div>
						) : null}
					</div>
				)}
			</section>

			{!model.hasOperationalData ? (
				<section aria-labelledby="partner-empty-heading" id="team">
					<h2
						id="partner-empty-heading"
						className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
					>
						Operação comercial
					</h2>
					<div data-testid="partner-operational-empty">
						<HonestState
							kind="empty"
							title="Parceiro registrado sem movimentação"
							description="Perfil carregado da API; accruals e payouts vazios. Nenhum valor financeiro inventado."
						/>
					</div>
				</section>
			) : null}
		</div>
	);
}
