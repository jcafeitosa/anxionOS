import { useEffect, useId, useRef } from "react";
import {
	OPERATOR_TAKEOVER_TARGET_LEVEL,
	takeoverConfirmSubmitDisabled,
} from "../../lib/operator-takeover-mutations";

export interface OperatorTakeoverConfirmDialogProps {
	open: boolean;
	agentLabel: string;
	approvalId: string;
	evidenceHash: string;
	reason: string;
	busy: boolean;
	onApprovalIdChange: (value: string) => void;
	onEvidenceHashChange: (value: string) => void;
	onReasonChange: (value: string) => void;
	onConfirm: () => void;
	onCancel: () => void;
}

export function OperatorTakeoverConfirmDialog({
	open,
	agentLabel,
	approvalId,
	evidenceHash,
	reason,
	busy,
	onApprovalIdChange,
	onEvidenceHashChange,
	onReasonChange,
	onConfirm,
	onCancel,
}: OperatorTakeoverConfirmDialogProps) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const titleId = useId();
	const descriptionId = useId();
	const approvalFieldId = useId();
	const evidenceFieldId = useId();
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

	if (!open) {
		return null;
	}

	const submitDisabled = takeoverConfirmSubmitDisabled({
		busy,
		approvalId,
		evidenceHash,
	});

	return (
		<dialog
			ref={dialogRef}
			className="max-w-md w-[calc(100%-2rem)] rounded-lg border border-border bg-surface p-0 text-foreground shadow-md backdrop:bg-background/80"
			aria-labelledby={titleId}
			aria-describedby={descriptionId}
			data-testid="operator-takeover-confirm-dialog"
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
						Confirmar takeover operacional?
					</h4>
					<p id={descriptionId} className="mt-2 text-sm text-muted-foreground">
						{agentLabel}. Transição para {OPERATOR_TAKEOVER_TARGET_LEVEL} com
						transitionKind takeover — POST com Idempotency-Key; nenhum estado local é
						simulado.
					</p>
				</div>
				<div>
					<label
						htmlFor={approvalFieldId}
						className="mb-1 block text-sm font-medium text-foreground"
					>
						approvalId (UUID institucional)
					</label>
					<input
						id={approvalFieldId}
						type="text"
						className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground focus-visible:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						value={approvalId}
						maxLength={36}
						disabled={busy}
						autoComplete="off"
						data-testid="operator-takeover-approval-id"
						onChange={(event) => onApprovalIdChange(event.target.value)}
					/>
				</div>
				<div>
					<label
						htmlFor={evidenceFieldId}
						className="mb-1 block text-sm font-medium text-foreground"
					>
						evidenceHash
					</label>
					<input
						id={evidenceFieldId}
						type="text"
						className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground focus-visible:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						value={evidenceHash}
						maxLength={256}
						disabled={busy}
						autoComplete="off"
						data-testid="operator-takeover-evidence-hash"
						onChange={(event) => onEvidenceHashChange(event.target.value)}
					/>
				</div>
				<div>
					<label
						htmlFor={reasonFieldId}
						className="mb-1 block text-sm font-medium text-foreground"
					>
						Motivo (opcional)
					</label>
					<textarea
						id={reasonFieldId}
						className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						value={reason}
						maxLength={500}
						disabled={busy}
						data-testid="operator-takeover-reason"
						onChange={(event) => onReasonChange(event.target.value)}
					/>
				</div>
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
						className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-destructive bg-destructive px-4 text-sm font-semibold text-on-destructive transition-colors duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
						disabled={submitDisabled}
						data-testid="operator-takeover-confirm-submit"
					>
						{busy ? "Enviando…" : "Executar takeover"}
					</button>
				</div>
			</form>
		</dialog>
	);
}
