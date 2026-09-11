import { useCallback, useEffect, useState } from "react";
import {
	createRecoveryMutationIdempotencyKey,
	executeRecoveryTaskMutation,
	recoveryMutationActionLabel,
	recoveryMutationOutcomeMessage,
	recoveryTaskAvailableMutations,
	type RecoveryMutationAction,
	type RecoveryMutationOutcome,
} from "../../lib/operator-recovery-mutations";
import {
	fetchIncidentRecoveryTasks,
	recoveryTaskDisplayLabel,
	recoveryTaskEmptyDescription,
	type IncidentRecoveryTasksView,
	type RecoveryTaskItem,
} from "../../lib/operator-recovery-tasks";
import { HonestState } from "./HonestState";
import { OperatorRecoveryConfirmDialog } from "./OperatorRecoveryConfirmDialog";

interface OperatorRecoveryTasksPanelProps {
	agencyId: string;
	incidentId: string;
}

type PendingMutation = {
	task: RecoveryTaskItem;
	action: RecoveryMutationAction;
};

export function OperatorRecoveryTasksPanel({
	agencyId,
	incidentId,
}: OperatorRecoveryTasksPanelProps) {
	const [view, setView] = useState<IncidentRecoveryTasksView>({ kind: "loading" });
	const [refreshNonce, setRefreshNonce] = useState(0);
	const [pendingMutation, setPendingMutation] = useState<PendingMutation | null>(
		null,
	);
	const [reason, setReason] = useState("");
	const [mutatingTaskId, setMutatingTaskId] = useState<string | null>(null);
	const [feedback, setFeedback] = useState<{
		taskId: string;
		message: string;
		kind: RecoveryMutationOutcome["kind"];
	} | null>(null);

	const reloadTasks = useCallback(() => {
		setRefreshNonce((value) => value + 1);
	}, []);

	useEffect(() => {
		let cancelled = false;
		setView({ kind: "loading" });
		fetchIncidentRecoveryTasks(agencyId, incidentId).then((next) => {
			if (!cancelled) {
				setView(next);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [agencyId, incidentId, refreshNonce]);

	const headingId = `operator-recovery-tasks-${incidentId}`;

	function openMutationDialog(task: RecoveryTaskItem, action: RecoveryMutationAction) {
		setReason("");
		setPendingMutation({ task, action });
	}

	function closeMutationDialog() {
		if (mutatingTaskId) {
			return;
		}
		setPendingMutation(null);
		setReason("");
	}

	async function confirmMutation() {
		if (!pendingMutation) {
			return;
		}
		const { task, action } = pendingMutation;
		const idempotencyKey = createRecoveryMutationIdempotencyKey();
		setMutatingTaskId(task.recoveryTaskId);
		setFeedback(null);

		const body = {
			expectedRevision: task.revision,
			...(action === "fail" && reason.trim()
				? { failureReason: reason.trim() }
				: {}),
			...(action === "cancel" && reason.trim()
				? { cancelReason: reason.trim() }
				: {}),
		};

		const outcome = await executeRecoveryTaskMutation(
			agencyId,
			task.recoveryTaskId,
			action,
			body,
			idempotencyKey,
		);

		setMutatingTaskId(null);
		setPendingMutation(null);
		setReason("");
		setFeedback({
			taskId: task.recoveryTaskId,
			message: recoveryMutationOutcomeMessage(outcome),
			kind: outcome.kind,
		});

		if (outcome.kind === "success" || outcome.kind === "revision_conflict") {
			reloadTasks();
		}
	}

	return (
		<div
			className="mt-3 border-t border-border pt-3"
			data-testid="operator-recovery-tasks-panel"
			data-incident-id={incidentId}
			aria-labelledby={headingId}
		>
			<h3
				id={headingId}
				className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
			>
				Recovery tasks
			</h3>
			{view.kind === "loading" ? (
				<HonestState
					kind="loading"
					titleAs="h3"
					title="Consultando recovery tasks"
					description="GET /v1/operations/agencies/:agencyId/incidents/:incidentId/recovery-tasks com a sessão do membership. Nenhuma task é inventada."
				/>
			) : null}
			{view.kind === "denied" ? (
				<HonestState
					kind="denied"
					titleAs="h3"
					title="Listagem de recovery tasks negada"
					description={`HTTP ${String(view.status)}. O Operator console não inventa recovery tasks locais.`}
				/>
			) : null}
			{view.kind === "stale" ? (
				<HonestState
					kind="stale"
					titleAs="h3"
					title="Recovery tasks indisponíveis"
					description="A resposta não pôde ser interpretada como fila de recovery tasks. Nenhum DTO é inventado."
				/>
			) : null}
			{view.kind === "empty" ? (
				<HonestState
					kind="empty"
					titleAs="h3"
					title={
						view.reason === "no_recovery_tasks"
							? "Nenhuma recovery task"
							: "Listagem de recovery tasks ainda não publicada"
					}
					description={recoveryTaskEmptyDescription(view.reason)}
				/>
			) : null}
			{view.kind === "ready" ? (
				<ul
					className="flex flex-col gap-2"
					data-testid="operator-recovery-tasks-list"
				>
					{view.items.map((task) => {
						const actions = recoveryTaskAvailableMutations(task);
						const busy = mutatingTaskId === task.recoveryTaskId;
						const taskFeedback =
							feedback?.taskId === task.recoveryTaskId ? feedback : null;
						return (
							<li
								key={task.recoveryTaskId}
								className="min-h-11 rounded-md border border-border bg-background px-3 py-2"
								data-testid="operator-recovery-task-item"
								data-recovery-task-id={task.recoveryTaskId}
							>
								<p className="text-sm font-medium text-foreground">
									{recoveryTaskDisplayLabel(task)}
								</p>
								<p className="font-mono text-xs text-muted-foreground">
									rev {task.revision} · {task.recoveryTaskId}
								</p>
								{taskFeedback ? (
									<p
										className="mt-2 text-xs text-muted-foreground"
										data-testid="operator-recovery-mutation-feedback"
										role={
											taskFeedback.kind === "success" ? "status" : "alert"
										}
										aria-live={
											taskFeedback.kind === "success" ? "polite" : "assertive"
										}
									>
										{taskFeedback.message}
									</p>
								) : null}
								{actions.length > 0 ? (
									<div
										className="mt-2 flex flex-wrap gap-2"
										data-testid="operator-recovery-task-actions"
									>
										{actions.map((action) => (
											<button
												key={action}
												type="button"
												className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
												disabled={busy}
												data-testid={`operator-recovery-action-${action}`}
												onClick={() => openMutationDialog(task, action)}
											>
												{recoveryMutationActionLabel(action)}
											</button>
										))}
									</div>
								) : null}
							</li>
						);
					})}
				</ul>
			) : null}
			<OperatorRecoveryConfirmDialog
				open={pendingMutation !== null}
				action={pendingMutation?.action ?? null}
				taskLabel={
					pendingMutation
						? recoveryTaskDisplayLabel(pendingMutation.task)
						: ""
				}
				reason={reason}
				busy={mutatingTaskId !== null}
				onReasonChange={setReason}
				onConfirm={() => {
					void confirmMutation();
				}}
				onCancel={closeMutationDialog}
			/>
		</div>
	);
}
