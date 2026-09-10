import { useEffect, useState } from "react";

const STEPS = [
	{ label: "Login", detail: "E-mail e senha na sessão Better Auth" },
	{ label: "Loader", detail: "GET /v1/auth/post-login-context" },
	{ label: "Console", detail: "Owner em /agency/:id — skip-link no shell" },
] as const;

export function LoginConsoleDemo() {
	const [step, setStep] = useState(0);

	useEffect(() => {
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
		if (reduce.matches) {
			return;
		}
		const timer = window.setInterval(() => {
			setStep((current) => (current + 1) % STEPS.length);
		}, 2200);
		return () => window.clearInterval(timer);
	}, []);

	const current = STEPS[step];

	return (
		<figure className="overflow-hidden rounded-2xl border border-border bg-surface">
			<figcaption className="sr-only">
				Demonstração do fluxo login, loader e console Owner. Sem dados de tenant inventados.
			</figcaption>
			<div className="flex items-center justify-between border-b border-border px-4 py-3 text-xs text-muted-foreground">
				<span className="font-mono">fluxo institucional</span>
				<span>
					{step + 1}/{STEPS.length}
				</span>
			</div>
			<div className="space-y-3 p-5" aria-live="polite">
				<ol className="flex gap-2">
					{STEPS.map((item, index) => (
						<li
							key={item.label}
							className={`min-h-11 flex-1 rounded-lg border px-2 py-2 text-center text-xs font-medium transition-opacity duration-200 ${
								index === step
									? "border-accent text-foreground"
									: "border-border text-muted-foreground"
							}`}
						>
							{item.label}
						</li>
					))}
				</ol>
				<div className="motion-enter rounded-xl border border-border bg-background-deep/80 p-4">
					<p className="font-[family-name:var(--font-display)] text-lg text-foreground">
						{current.label}
					</p>
					<p className="mt-1 text-sm text-muted-foreground">{current.detail}</p>
				</div>
			</div>
		</figure>
	);
}
