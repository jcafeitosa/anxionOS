import { useEffect, useState } from "react";
import {
	fetchAgencyOrders,
	orderDisplayLabel,
	orderEmptyDescription,
	ORDERS_COLLECTION_CONTRACT,
	type AgencyOrdersView,
} from "../../lib/operator-orders";
import { HonestState } from "./HonestState";

interface OperatorOrdersPanelProps {
	agencyId: string;
}

export function OperatorOrdersPanel({ agencyId }: OperatorOrdersPanelProps) {
	const [view, setView] = useState<AgencyOrdersView>({ kind: "loading" });

	useEffect(() => {
		let cancelled = false;
		setView({ kind: "loading" });
		fetchAgencyOrders(agencyId).then((next) => {
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
			aria-labelledby="operator-orders-heading"
			data-testid="operator-orders-panel"
		>
			<h2
				id="operator-orders-heading"
				className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
			>
				Ordens de execução
			</h2>
			<p
				className="mb-4 font-mono text-xs text-muted-foreground"
				data-testid="operator-orders-contract"
			>
				{ORDERS_COLLECTION_CONTRACT}
			</p>
			{view.kind === "loading" ? (
				<HonestState
					kind="loading"
					titleAs="h3"
					title="Consultando ordens da agência"
					description="GET /v1/execution/agencies/:agencyId/orders com a sessão do membership. Nenhuma ordem é inventada."
				/>
			) : null}
			{view.kind === "denied" ? (
				<HonestState
					kind="denied"
					titleAs="h3"
					title="Listagem de ordens negada"
					description={`HTTP ${String(view.status)}. O Operator console não inventa ordens locais.`}
				/>
			) : null}
			{view.kind === "stale" ? (
				<HonestState
					kind="stale"
					titleAs="h3"
					title="Ordens indisponíveis"
					description="A resposta não pôde ser interpretada como fila de ordens. Nenhum DTO é inventado."
				/>
			) : null}
			{view.kind === "empty" ? (
				<HonestState
					kind="empty"
					titleAs="h3"
					title={
						view.reason === "no_orders"
							? "Nenhuma ordem registrada"
							: "Listagem de ordens ainda não publicada"
					}
					description={orderEmptyDescription(view.reason)}
				/>
			) : null}
			{view.kind === "ready" ? (
				<ul className="flex flex-col gap-2" data-testid="operator-orders-list">
					{view.items.map((order) => (
						<li
							key={order.orderId}
							className="min-h-11 rounded-lg border border-border bg-surface px-4 py-3"
							data-testid="operator-order-item"
							data-order-id={order.orderId}
						>
							<p className="font-medium text-foreground">
								{orderDisplayLabel(order)}
							</p>
							<p className="font-mono text-xs text-muted-foreground">
								{order.executionMode} · {order.clientOrderId} ·{" "}
								{order.revision !== undefined ? `rev ${order.revision} · ` : ""}
								{order.orderId}
							</p>
						</li>
					))}
				</ul>
			) : null}
		</section>
	);
}
