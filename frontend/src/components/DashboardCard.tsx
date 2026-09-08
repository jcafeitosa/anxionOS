import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { StatusBadge } from "./StatusBadge";

interface DashboardCardProps {
	title: string;
	description: string;
	icon: LucideIcon;
	children?: ReactNode;
	status?: "online" | "degraded" | "offline" | "pending";
	statusLabel?: string;
}

export function DashboardCard({
	title,
	description,
	icon: Icon,
	children,
	status,
	statusLabel,
}: DashboardCardProps) {
	return (
		<article
			className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-md transition-shadow duration-200 hover:shadow-lg"
		>
			<header className="flex items-start justify-between gap-3">
				<div className="flex items-start gap-3">
					<div
						className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-accent"
						aria-hidden="true"
					>
						<Icon className="size-5" strokeWidth={1.75} />
					</div>
					<div>
						<h2 className="text-base font-semibold text-foreground">{title}</h2>
						<p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
					</div>
				</div>
				{status ? <StatusBadge status={status} label={statusLabel} /> : null}
			</header>
			{children ? <div className="text-sm text-muted-foreground">{children}</div> : null}
		</article>
	);
}
