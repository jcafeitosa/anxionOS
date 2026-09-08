type Status = "online" | "degraded" | "offline" | "pending";

const statusStyles: Record<Status, string> = {
	online: "bg-accent/15 text-accent border-accent/30",
	degraded: "bg-amber-500/15 text-amber-400 border-amber-500/30",
	offline: "bg-destructive/15 text-destructive border-destructive/30",
	pending: "bg-muted-foreground/15 text-muted-foreground border-border",
};

const statusLabels: Record<Status, string> = {
	online: "Operacional",
	degraded: "Degradado",
	offline: "Offline",
	pending: "Pendente",
};

interface StatusBadgeProps {
	status: Status;
	label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[status]}`}
			role="status"
			aria-label={label ?? statusLabels[status]}
		>
			<span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
			{label ?? statusLabels[status]}
		</span>
	);
}
