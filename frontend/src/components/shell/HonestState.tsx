interface HonestStateProps {
	kind: "loading" | "empty" | "denied" | "stale" | "pending";
	title: string;
	description: string;
	actionHref?: string;
	actionLabel?: string;
	titleAs?: "h1" | "h2" | "h3";
}

const kindLabel: Record<HonestStateProps["kind"], string> = {
	loading: "Carregando",
	empty: "Vazio",
	denied: "Acesso negado",
	stale: "Desatualizado",
	pending: "Pendente",
};

export function HonestState({
	kind,
	title,
	description,
	actionHref,
	actionLabel,
	titleAs = "h1",
}: HonestStateProps) {
	const TitleTag = titleAs;
	return (
		<section
			className="mx-auto max-w-lg rounded-2xl border border-border bg-surface p-8"
			data-testid={`honest-state-${kind}`}
			aria-live={kind === "loading" ? "polite" : undefined}
			aria-busy={kind === "loading"}
		>
			<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				{kindLabel[kind]}
			</p>
			<TitleTag className="mt-2 text-2xl font-semibold text-foreground">{title}</TitleTag>
			<p className="mt-3 text-sm text-muted-foreground">{description}</p>
			{actionHref && actionLabel ? (
				<a
					href={actionHref}
					className="mt-6 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg bg-accent px-4 font-semibold text-on-accent transition-colors duration-200 hover:opacity-90"
				>
					{actionLabel}
				</a>
			) : null}
		</section>
	);
}
