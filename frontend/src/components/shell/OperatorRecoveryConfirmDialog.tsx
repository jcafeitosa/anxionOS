import { useEffect, useId, useRef } from "react";
import type { RecoveryMutationAction } from "../../lib/operator-recovery-mutations";
import {
	recoveryMutationActionLabel,
	recoveryMutationIsDestructive,
	recoveryMutationRequiresReason,
} from "../../lib/operator-recovery-mutations";

export interface OperatorRecoveryConfirmDialogProps {
	open: boolean;
	action: RecoveryMutationAction | null;
	taskLabel: string;
	reason: string;
	busy: boolean;
	onReasonChange: (value: string) => void;
	onConfirm: () => void;
	onCancel: () => void;
}

export function OperatorRecoveryConfirmDialog({
	open,
	action,
	taskLabel,
	reason,
	busy,
	onReasonChange,
	onConfirm,
	onCancel,
}: OperatorRecoveryConfirmDialogProps) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const titleId = useId();
	const descriptionId = useId();
	const reasonFieldId = useId();

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

	const destructive = recoveryMutationIsDestructive(action);
	const reasonKind = recoveryMutationRequiresReason(action);
	const actionLabel = recoveryMutationActionLabel(action);

	return (
		<dialog
			ref={dialogRef}
			className="max-w-md w-[calc(100%-2rem)] rounded-lg border border-border bg-surface p-0 text-foreground shadow-md backdrop:bg-background/80"
			aria-labelledby={titleId}
			aria-describedby={descriptionId}
			data-testid="operator-recovery-confirm-dialog"
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
					if (!busy) {
						onConfirm();
					}
				}}
			>
				<div>
					<h4 id={titleId} className="text-base font-semibold text-foreground">
						{actionLabel} recovery task?
					</h4>
					<p id={descriptionId} className="mt-2 text-sm text-muted-foreground">
						{taskLabel}. O comando usa POST com Idempotency-Key e revisão esperada —
						nenhum estado local é simulado.
					</p>
				</div>
				{reasonKind ? (
					<div>
						<label
							htmlFor={reasonFieldId}
							className="mb-1 block text-sm font-medium text-foreground"
						>
							{reasonKind === "failureReason"
								? "Motivo da falha (opcional)"
								: "Motivo do cancelamento (opcional)"}
						</label>
						<textarea
							id={reasonFieldId}
							className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							value={reason}
							maxLength={4096}
							disabled={busy}
							onChange={(event) => onReasonChange(event.target.value)}
						/>
					</div>
				) : null}
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
								? "inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-destructive bg-destructive px-4 text-sm font-semibold text-on-destructive transition-colors duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
								: "inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent transition-colors duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
						}
						disabled={busy}
						data-testid="operator-recovery-confirm-submit"
					>
						{busy ? "Enviando…" : actionLabel}
					</button>
				</div>
			</form>
		</dialog>
	);
}
