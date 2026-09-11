import { useEffect, useId, useRef } from "react";
import type { KillSwitchMutationAction } from "../../lib/operator-kill-switch-mutations";
import {
	killSwitchActivateSubmitDisabled,
	killSwitchMutationActionLabel,
	killSwitchMutationIsDestructive,
	killSwitchReleaseSubmitDisabled,
} from "../../lib/operator-kill-switch-mutations";

export interface OperatorKillSwitchConfirmDialogProps {
	open: boolean;
	action: KillSwitchMutationAction | null;
	reason: string;
	activatedBy: string;
	releasedBy: string;
	operatorPrincipalId?: string | null;
	busy: boolean;
	onReasonChange: (value: string) => void;
	onActivatedByChange: (value: string) => void;
	onReleasedByChange: (value: string) => void;
	onConfirm: () => void;
	onCancel: () => void;
}

export function OperatorKillSwitchConfirmDialog({
	open,
	action,
	reason,
	activatedBy,
	releasedBy,
	operatorPrincipalId = null,
	busy,
	onReasonChange,
	onActivatedByChange,
	onReleasedByChange,
	onConfirm,
	onCancel,
}: OperatorKillSwitchConfirmDialogProps) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const titleId = useId();
	const descriptionId = useId();
	const reasonFieldId = useId();
	const activatedByFieldId = useId();
	const releasedByFieldId = useId();

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) {
			return;
		}
		if (open && !dialog.open) {
			dialog.showModal();
		}
		if (!open && dialog.open) {
			dialog.close();
		}
	}, [open]);

	if (!action) {
		return null;
	}

	const destructive = killSwitchMutationIsDestructive(action);
	const actionLabel = killSwitchMutationActionLabel(action);
	const principalFieldsReadOnly = Boolean(operatorPrincipalId);
	const submitDisabled =
		action === "activate"
			? killSwitchActivateSubmitDisabled({ busy, reason, activatedBy })
			: killSwitchReleaseSubmitDisabled({ busy, releasedBy });

	return (
		<dialog
			ref={dialogRef}
			className="max-w-md w-[calc(100%-2rem)] rounded-lg border border-border bg-surface p-0 text-foreground shadow-md backdrop:bg-background/80"
			aria-labelledby={titleId}
			aria-describedby={descriptionId}
			data-testid="operator-kill-switch-confirm-dialog"
			onCancel={(event) => {
				event.preventDefault();
				if (!busy) {
					onCancel();
				}
			}}
			onClose={() => {
				if (!busy) {
					onCancel();
				}
			}}
		>
			<form
				method="dialog"
				className="flex flex-col gap-4 p-6"
				onSubmit={(event) => {
					event.preventDefault();
					if (!submitDisabled) {
						onConfirm();
					}
				}}
			>
				<div>
					<h4 id={titleId} className="text-base font-semibold text-foreground">
						{actionLabel}?
					</h4>
					<p id={descriptionId} className="mt-2 text-sm text-muted-foreground">
						Comando POST com Idempotency-Key — bump de riskEpoch e bloqueio de
						dispatch quando ativo. Nenhum estado local é simulado.
					</p>
				</div>
				{action === "activate" ? (
					<>
						<div>
							<label
								htmlFor={reasonFieldId}
								className="mb-1 block text-sm font-medium text-foreground"
							>
								Motivo (obrigatório)
							</label>
							<textarea
								id={reasonFieldId}
								className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								value={reason}
								maxLength={512}
								disabled={busy}
								data-testid="operator-kill-switch-reason"
								onChange={(event) => onReasonChange(event.target.value)}
							/>
						</div>
						<div>
							<label
								htmlFor={activatedByFieldId}
								className="mb-1 block text-sm font-medium text-foreground"
							>
								activatedBy
							</label>
							<input
								id={activatedByFieldId}
								type="text"
								className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground focus-visible:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								value={activatedBy}
								maxLength={128}
								disabled={busy}
								readOnly={principalFieldsReadOnly}
								autoComplete="off"
								data-testid="operator-kill-switch-activated-by"
								onChange={(event) => onActivatedByChange(event.target.value)}
							/>
						</div>
					</>
				) : (
					<div>
						<label
							htmlFor={releasedByFieldId}
							className="mb-1 block text-sm font-medium text-foreground"
						>
							releasedBy
						</label>
						<input
							id={releasedByFieldId}
							type="text"
							className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground focus-visible:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							value={releasedBy}
							maxLength={128}
							disabled={busy}
							readOnly={principalFieldsReadOnly}
							autoComplete="off"
							data-testid="operator-kill-switch-released-by"
							onChange={(event) => onReleasedByChange(event.target.value)}
						/>
					</div>
				)}
				<div className="flex flex-wrap justify-end gap-2">
					<button
						type="button"
						className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-border bg-transparent px-4 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						disabled={busy}
						onClick={onCancel}
					>
						Voltar
					</button>
					<button
						type="submit"
						className={
							destructive
								? "inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-destructive bg-destructive px-4 text-sm font-semibold text-foreground transition-colors duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
								: "inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent transition-colors duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
						}
						disabled={submitDisabled}
						data-testid="operator-kill-switch-confirm-submit"
					>
						{busy ? "Enviando…" : actionLabel}
					</button>
				</div>
			</form>
		</dialog>
	);
}
