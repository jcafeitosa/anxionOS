import { useCallback, useEffect, useState } from "react";
import {
	fetchAgencyAgentsCatalog,
	type AgencyAgentsCatalogView,
	type AgentCatalogItem,
} from "../../lib/agency-agents-catalog";
import {
	autonomyDisplayLabel,
	fetchAgentsAutonomy,
	type AgentAutonomyView,
} from "../../lib/owner-agent-autonomy";
import {
	createTakeoverMutationIdempotencyKey,
	executeOperatorTakeover,
	OPERATOR_TAKEOVER_TARGET_LEVEL,
	takeoverAgentEligibleForMutation,
	takeoverMutationOutcomeMessage,
	TAKEOVER_MUTATION_CONTRACT,
} from "../../lib/operator-takeover-mutations";
import {
	TAKEOVER_READ_CONTRACT,
	takeoverAgentDisplayLabel,
	takeoverEmptyDescription,
} from "../../lib/operator-takeover";
import { HonestState } from "./HonestState";
import { OperatorTakeoverConfirmDialog } from "./OperatorTakeoverConfirmDialog";

interface OperatorTakeoverPanelProps {
	agencyId: string;
}

type AgentAutonomyMap = Record<
	string,
	Exclude<AgentAutonomyView, { kind: "loading" }>
>;

type PendingTakeover = {
	agent: AgentCatalogItem;
};

function AgentAutonomyLine({
	agentId,
	view,
}: {
	agentId: string;
	view: AgentAutonomyView | undefined;
}) {
	if (!view || view.kind === "loading") {
		return (
			<p
				className="mt-1 text-xs text-muted-foreground"
				data-testid={`operator-takeover-autonomy-${agentId}`}
			>
				Consultando autonomia efetiva…
			</p>
		);
	}
	return (
		<p
			className="mt-1 text-xs text-muted-foreground"
			data-testid={`operator-takeover-autonomy-${agentId}`}
		>
			Autonomia efetiva: {autonomyDisplayLabel(view)}
			{view.kind === "ready" && view.assignmentRevision !== null
				? ` · rev ${String(view.assignmentRevision)}`
				: null}
		</p>
	);
}

export function OperatorTakeoverPanel({ agencyId }: OperatorTakeoverPanelProps) {
	const [view, setView] = useState<AgencyAgentsCatalogView>({ kind: "loading" });
	const [autonomyByAgent, setAutonomyByAgent] = useState<AgentAutonomyMap>({});
	const [refreshNonce, setRefreshNonce] = useState(0);
	const [pendingTakeover, setPendingTakeover] = useState<PendingTakeover | null>(
		null,
	);
	const [approvalId, setApprovalId] = useState("");
	const [evidenceHash, setEvidenceHash] = useState("");
	const [reason, setReason] = useState("");
	const [mutatingAgentId, setMutatingAgentId] = useState<string | null>(null);
	const [feedback, setFeedback] = useState<{
		agentId: string;
		message: string;
		kind: "success" | "denied" | "revision_conflict" | "validation_error" | "stale";
	} | null>(null);

	const reloadSnapshot = useCallback(() => {
		setRefreshNonce((value) => value + 1);
	}, []);

	useEffect(() => {
		let cancelled = false;
		setView({ kind: "loading" });
		setAutonomyByAgent({});
		fetchAgencyAgentsCatalog(agencyId).then((next) => {
			if (!cancelled) {
				setView(next);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [agencyId, refreshNonce]);

	useEffect(() => {
		if (view.kind !== "ready" || view.items.length === 0) {
			return;
		}
		let cancelled = false;
		const agentIds = view.items.map((agent) => agent.id);
		fetchAgentsAutonomy(agencyId, agentIds).then((map) => {
			if (!cancelled) {
				setAutonomyByAgent(map);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [agencyId, view]);

	function openTakeoverDialog(agent: AgentCatalogItem) {
		setApprovalId("");
		setEvidenceHash("");
		setReason("");
		setPendingTakeover({ agent });
	}

	function closeTakeoverDialog() {
		if (mutatingAgentId) {
			return;
		}
		setPendingTakeover(null);
		setApprovalId("");
		setEvidenceHash("");
		setReason("");
	}

	async function confirmTakeover() {
		if (!pendingTakeover) {
			return;
		}
		const { agent } = pendingTakeover;
		const idempotencyKey = createTakeoverMutationIdempotencyKey();
		setMutatingAgentId(agent.id);
		setFeedback(null);

		const body = {
			targetLevel: OPERATOR_TAKEOVER_TARGET_LEVEL,
			transitionKind: "takeover" as const,
			evidenceHash: evidenceHash.trim(),
			approvalId: approvalId.trim(),
			...(reason.trim() ? { reason: reason.trim() } : {}),
		};

		const outcome = await executeOperatorTakeover(
			agencyId,
			agent.id,
			body,
			idempotencyKey,
		);

		setMutatingAgentId(null);
		setPendingTakeover(null);
		setApprovalId("");
		setEvidenceHash("");
		setReason("");
		setFeedback({
			agentId: agent.id,
			message: takeoverMutationOutcomeMessage(outcome),
			kind: outcome.kind,
		});

		if (outcome.kind === "success" || outcome.kind === "revision_conflict") {
			reloadSnapshot();
		}
	}

	const mutationsAvailable = view.kind === "ready";

	return (
		<section
			aria-labelledby="operator-takeover-heading"
			data-testid="operator-takeover-panel"
			className="mt-8"
		>
			<h3
				id="operator-takeover-heading"
				className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
			>
				Takeover operacional
			</h3>
			<p
				className="mb-4 font-mono text-xs text-muted-foreground"
				data-testid="operator-takeover-read-contract"
			>
				{TAKEOVER_READ_CONTRACT}
			</p>
			<p
				className="mb-4 font-mono text-xs text-muted-foreground"
				data-testid="operator-takeover-mutation-contract"
			>
				{TAKEOVER_MUTATION_CONTRACT}
			</p>
			{view.kind === "loading" ? (
				<HonestState
					kind="loading"
					titleAs="h3"
					title="Consultando agentes para takeover"
					description="GET /v1/agencies/:agencyId/agents com a sessão do membership. Nenhum agente ou nível de autonomia é inventado."
				/>
			) : null}
			{view.kind === "denied" ? (
				<HonestState
					kind="denied"
					titleAs="h3"
					title="Takeover negado"
					description={`HTTP ${String(view.status)}. O Operator console não inventa agentes locais.`}
				/>
			) : null}
			{view.kind === "stale" ? (
				<HonestState
					kind="stale"
					titleAs="h3"
					title="Takeover indisponível"
					description="A resposta não pôde ser interpretada como lista de agentes. Nenhum DTO é inventado."
				/>
			) : null}
			{view.kind === "empty" ? (
				<HonestState
					kind="empty"
					titleAs="h3"
					title={
						view.reason === "no_agents"
							? "Nenhum agente para takeover"
							: "Listagem de agentes ainda não publicada"
					}
					description={takeoverEmptyDescription(view.reason)}
				/>
			) : null}
			{view.kind === "ready" ? (
				<ul
					className="flex flex-col gap-2"
					data-testid="operator-takeover-list"
					aria-label="Agentes elegíveis para takeover operacional"
				>
					{view.items.map((agent: AgentCatalogItem) => {
						const autonomy = autonomyByAgent[agent.id];
						const eligibility = takeoverAgentEligibleForMutation(agent, autonomy);
						const busy = mutatingAgentId === agent.id;
						const agentFeedback =
							feedback?.agentId === agent.id ? feedback : null;
						return (
							<li
								key={agent.id}
								className="min-h-11 rounded-lg border border-border bg-surface px-4 py-3"
								data-testid="operator-takeover-item"
								data-agent-id={agent.id}
							>
								<p className="font-medium text-foreground">
									{takeoverAgentDisplayLabel(agent)}
								</p>
								<p className="font-mono text-xs text-muted-foreground">{agent.id}</p>
								<AgentAutonomyLine
									agentId={agent.id}
									view={
										autonomyByAgent[agent.id]
											? autonomyByAgent[agent.id]
											: { kind: "loading" }
									}
								/>
								{agentFeedback ? (
									<p
										className="mt-2 text-xs text-muted-foreground"
										data-testid="operator-takeover-mutation-feedback"
										role={agentFeedback.kind === "success" ? "status" : "alert"}
										aria-live={
											agentFeedback.kind === "success" ? "polite" : "assertive"
										}
									>
										{agentFeedback.message}
									</p>
								) : null}
								<div className="mt-2 flex flex-wrap items-center gap-2">
									<button
										type="button"
										className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-destructive bg-destructive px-3 text-sm font-semibold text-on-destructive transition-colors duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
										disabled={
											!mutationsAvailable ||
											!eligibility.eligible ||
											busy ||
											mutatingAgentId !== null
										}
										title={
											eligibility.eligible
												? undefined
												: eligibility.reason
										}
										data-testid="operator-takeover-action"
										onClick={() => openTakeoverDialog(agent)}
									>
										Takeover → {OPERATOR_TAKEOVER_TARGET_LEVEL}
									</button>
									{!eligibility.eligible ? (
										<span
											className="text-xs text-muted-foreground"
											data-testid="operator-takeover-ineligible-reason"
										>
											{eligibility.reason}
										</span>
									) : null}
								</div>
							</li>
						);
					})}
				</ul>
			) : null}
			<OperatorTakeoverConfirmDialog
				open={pendingTakeover !== null}
				agentLabel={
					pendingTakeover
						? takeoverAgentDisplayLabel(pendingTakeover.agent)
						: ""
				}
				approvalId={approvalId}
				evidenceHash={evidenceHash}
				reason={reason}
				busy={mutatingAgentId !== null}
				onApprovalIdChange={setApprovalId}
				onEvidenceHashChange={setEvidenceHash}
				onReasonChange={setReason}
				onConfirm={() => {
					void confirmTakeover();
				}}
				onCancel={closeTakeoverDialog}
			/>
		</section>
	);
}
