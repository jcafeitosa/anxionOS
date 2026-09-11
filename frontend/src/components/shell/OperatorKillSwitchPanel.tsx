import { useCallback, useEffect, useState } from "react";
import {
	createKillSwitchMutationIdempotencyKey,
	executeKillSwitchMutation,
	KILL_SWITCH_MUTATIONS_CONTRACT,
	killSwitchMutationActionLabel,
	killSwitchMutationOutcomeMessage,
	type KillSwitchMutationAction,
	type KillSwitchMutationOutcome,
} from "../../lib/operator-kill-switch-mutations";
import {
	fetchAgencyKillSwitchStatus,
	KILL_SWITCH_READ_CONTRACT,
	killSwitchDisplayLabel,
	killSwitchEmptyDescription,
	killSwitchMutationsAvailable,
	type AgencyKillSwitchView,
} from "../../lib/operator-kill-switch";
import { HonestState } from "./HonestState";
import { OperatorKillSwitchConfirmDialog } from "./OperatorKillSwitchConfirmDialog";

interface OperatorKillSwitchPanelProps {
	agencyId: string;
	operatorPrincipalId?: string | null;
}

type PendingMutation = {
	action: KillSwitchMutationAction;
};

export function OperatorKillSwitchPanel({
	agencyId,
	operatorPrincipalId = null,
}: OperatorKillSwitchPanelProps) {
	const [view, setView] = useState<AgencyKillSwitchView>({ kind: "loading" });
	const [refreshNonce, setRefreshNonce] = useState(0);
	const [pendingMutation, setPendingMutation] = useState<PendingMutation | null>(
		null,
	);
	const [reason, setReason] = useState("");
	const [activatedBy, setActivatedBy] = useState("");
	const [releasedBy, setReleasedBy] = useState("");
	const [mutating, setMutating] = useState(false);
	const [feedback, setFeedback] = useState<{
		message: string;
		kind: KillSwitchMutationOutcome["kind"];
	} | null>(null);

	const reloadStatus = useCallback(() => {
		setRefreshNonce((value) => value + 1);
	}, []);

	useEffect(() => {
		let cancelled = false;
		setView({ kind: "loading" });
		fetchAgencyKillSwitchStatus(agencyId).then((next) => {
			if (!cancelled) {
				setView(next);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [agencyId, refreshNonce]);

	useEffect(() => {
		if (operatorPrincipalId) {
			setActivatedBy(operatorPrincipalId);
			setReleasedBy(operatorPrincipalId);
		}
	}, [operatorPrincipalId]);

	const mutationsAvailable = killSwitchMutationsAvailable(
		view.kind === "loading" ? { kind: "empty", reason: "collection_unavailable", status: 404 } : view,
	);

	function openMutationDialog(action: KillSwitchMutationAction) {
		setReason("");
		if (operatorPrincipalId) {
			setActivatedBy(operatorPrincipalId);
			setReleasedBy(operatorPrincipalId);
		}
		setPendingMutation({ action });
	}

	function closeMutationDialog() {
		if (mutating) {
			return;
		}
		setPendingMutation(null);
		setReason("");
	}

	async function confirmMutation() {
		if (!pendingMutation) {
			return;
		}
		const { action } = pendingMutation;
		const idempotencyKey = createKillSwitchMutationIdempotencyKey();
		setMutating(true);
		setFeedback(null);

		const body =
			action === "activate"
				? {
						reason: reason.trim(),
						activatedBy: activatedBy.trim(),
						scope: "ORGANIZATION" as const,
					}
				: {
						releasedBy: releasedBy.trim(),
						scope: "ORGANIZATION" as const,
					};

		const outcome = await executeKillSwitchMutation(
			agencyId,
			action,
			body,
			idempotencyKey,
		);

		setMutating(false);
		setPendingMutation(null);
		setReason("");
		setFeedback({
			message: killSwitchMutationOutcomeMessage(outcome),
			kind: outcome.kind,
		});

		if (outcome.kind === "success" || outcome.kind === "revision_conflict") {
			reloadStatus();
		}
	}

	const status = view.kind === "ready" ? view.status : null;
	const canActivate = status !== null && !status.killSwitchActive;
	const canRelease = status !== null && status.killSwitchActive;

	return (
		<section
			aria-labelledby="operator-kill-switch-heading"
			data-testid="operator-kill-switch-panel"
			className="mt-8"
		>
			<h3
				id="operator-kill-switch-heading"
				className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
			>
				Kill switch de risco
			</h3>
			<p
				className="mb-4 font-mono text-xs text-muted-foreground"
				data-testid="operator-kill-switch-read-contract"
			>
				{KILL_SWITCH_READ_CONTRACT}
			</p>
			<p
				className="mb-4 font-mono text-xs text-muted-foreground"
				data-testid="operator-kill-switch-mutation-contract"
			>
				{KILL_SWITCH_MUTATIONS_CONTRACT}
			</p>
			{view.kind === "loading" ? (
				<HonestState
					kind="loading"
					titleAs="h3"
					title="Consultando kill switch da agência"
					description="GET /v1/risk/agencies/:agencyId/kill-switch com a sessão do membership. Nenhum estado de risco é inventado."
				/>
			) : null}
			{view.kind === "denied" ? (
				<HonestState
					kind="denied"
					titleAs="h3"
					title="Kill switch negado"
					description={`HTTP ${String(view.status)}. O Operator console não inventa estado de risco local.`}
				/>
			) : null}
			{view.kind === "stale" ? (
				<HonestState
					kind="stale"
					titleAs="h3"
					title="Kill switch indisponível"
					description="A resposta não pôde ser interpretada como status de kill switch. Nenhum DTO é inventado."
				/>
			) : null}
			{view.kind === "empty" ? (
				<HonestState
					kind="empty"
					titleAs="h3"
					title="Superfície de kill switch ainda não publicada"
					description={killSwitchEmptyDescription(view.reason)}
				/>
			) : null}
			{view.kind === "ready" ? (
				<div
					className="rounded-lg border border-border bg-surface px-4 py-3"
					data-testid="operator-kill-switch-status"
				>
					<p className="font-medium text-foreground">
						{killSwitchDisplayLabel(view.status)}
					</p>
					<p className="font-mono text-xs text-muted-foreground">
						{view.status.killSwitchId ?? "sem killSwitchId"} · org{" "}
						{view.status.organizationId}
						{view.status.riskEpoch !== undefined
							? ` · riskEpoch ${String(view.status.riskEpoch)}`
							: ""}
						{view.status.activatedAt
							? ` · ativado ${view.status.activatedAt}`
							: ""}
					</p>
					{feedback ? (
						<p
							className="mt-2 text-xs text-muted-foreground"
							data-testid="operator-kill-switch-mutation-feedback"
							role={feedback.kind === "success" ? "status" : "alert"}
							aria-live={
								feedback.kind === "success" ? "polite" : "assertive"
							}
						>
							{feedback.message}
						</p>
					) : null}
					<div className="mt-3 flex flex-wrap gap-2">
						<button
							type="button"
							className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-destructive bg-destructive px-3 text-sm font-semibold text-foreground transition-colors duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
							disabled={
								!mutationsAvailable || !canActivate || mutating
							}
							data-testid="operator-kill-switch-activate"
							onClick={() => openMutationDialog("activate")}
						>
							{killSwitchMutationActionLabel("activate")}
						</button>
						<button
							type="button"
							className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-border bg-transparent px-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
							disabled={
								!mutationsAvailable || !canRelease || mutating
							}
							data-testid="operator-kill-switch-release"
							onClick={() => openMutationDialog("release")}
						>
							{killSwitchMutationActionLabel("release")}
						</button>
					</div>
				</div>
			) : null}
			<OperatorKillSwitchConfirmDialog
				open={pendingMutation !== null}
				action={pendingMutation?.action ?? null}
				reason={reason}
				activatedBy={activatedBy}
				releasedBy={releasedBy}
				operatorPrincipalId={operatorPrincipalId}
				busy={mutating}
				onReasonChange={setReason}
				onActivatedByChange={setActivatedBy}
				onReleasedByChange={setReleasedBy}
				onConfirm={() => {
					void confirmMutation();
				}}
				onCancel={closeMutationDialog}
			/>
		</section>
	);
}
