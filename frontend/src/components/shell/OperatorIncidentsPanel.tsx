import { useEffect, useState } from "react";
import {
	fetchAgencyIncidents,
	incidentDisplayLabel,
	incidentEmptyDescription,
	type AgencyIncidentsView,
} from "../../lib/operator-incidents";
import { HonestState } from "./HonestState";
import { OperatorRecoveryTasksPanel } from "./OperatorRecoveryTasksPanel";

interface OperatorIncidentsPanelProps {
	agencyId: string;
}

export function OperatorIncidentsPanel({ agencyId }: OperatorIncidentsPanelProps) {
	const [view, setView] = useState<AgencyIncidentsView>({ kind: "loading" });
	const [expandedIncidentId, setExpandedIncidentId] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		setView({ kind: "loading" });
		fetchAgencyIncidents(agencyId).then((next) => {
			if (!cancelled) {
				setView(next);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [agencyId]);

	function toggleRecoveryTasks(incidentId: string) {
		setExpandedIncidentId((current) =>
			current === incidentId ? null : incidentId,
		);
	}

	return (
		<section
			aria-labelledby="operator-incidents-heading"
			data-testid="operator-incidents-panel"
			id="activity"
		>
			<h3
				id="operator-incidents-heading"
				className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
			>
				Incidentes operacionais
			</h3>
			{view.kind === "loading" ? (
				<HonestState
					kind="loading"
					titleAs="h3"
					title="Consultando incidentes da agência"
					description="GET /v1/operations/agencies/:agencyId/incidents com a sessão do membership. Nenhum incidente é inventado."
				/>
			) : null}
			{view.kind === "denied" ? (
				<HonestState
					kind="denied"
					titleAs="h3"
					title="Listagem de incidentes negada"
					description={`HTTP ${String(view.status)}. O Operator console não inventa incidentes locais.`}
				/>
			) : null}
			{view.kind === "stale" ? (
				<HonestState
					kind="stale"
					titleAs="h3"
					title="Incidentes indisponíveis"
					description="A resposta não pôde ser interpretada como fila de incidentes. Nenhum DTO é inventado."
				/>
			) : null}
			{view.kind === "empty" ? (
				<HonestState
					kind="empty"
					titleAs="h3"
					title={
						view.reason === "no_incidents"
							? "Nenhum incidente registrado"
							: "Listagem de incidentes ainda não publicada"
					}
					description={incidentEmptyDescription(view.reason)}
				/>
			) : null}
			{view.kind === "ready" ? (
				<ul className="flex flex-col gap-2" data-testid="operator-incidents-list">
					{view.items.map((incident) => {
						const expanded = expandedIncidentId === incident.incidentId;
						return (
							<li
								key={incident.incidentId}
								className="min-h-11 rounded-lg border border-border bg-surface px-4 py-3"
								data-testid="operator-incident-item"
								data-incident-id={incident.incidentId}
							>
								<p className="font-medium text-foreground">
									{incidentDisplayLabel(incident)}
								</p>
								<p className="font-mono text-xs text-muted-foreground">
									{incident.serviceId ?? "sem serviceId"} · rev {incident.revision} ·{" "}
									{incident.incidentId}
								</p>
								<button
									type="button"
									className="mt-2 inline-flex min-h-11 min-w-11 cursor-pointer items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-secondary"
									aria-expanded={expanded}
									aria-controls={`operator-recovery-tasks-region-${incident.incidentId}`}
									data-testid="operator-incident-recovery-toggle"
									onClick={() => toggleRecoveryTasks(incident.incidentId)}
								>
									{expanded ? "Ocultar recovery tasks" : "Ver recovery tasks"}
								</button>
								{expanded ? (
									<div
										id={`operator-recovery-tasks-region-${incident.incidentId}`}
										role="region"
										aria-labelledby={`operator-recovery-tasks-${incident.incidentId}`}
									>
										<OperatorRecoveryTasksPanel
											agencyId={agencyId}
											incidentId={incident.incidentId}
										/>
									</div>
								) : null}
							</li>
						);
					})}
				</ul>
			) : null}
		</section>
	);
}
