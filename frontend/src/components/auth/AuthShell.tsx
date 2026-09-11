import type { ReactNode } from "react";
import { GitBranch } from "lucide-react";
import { InstitutionalTicker } from "../marketing/InstitutionalTicker";

interface AuthShellProps {
	eyebrow: string;
	title: string;
	description: string;
	children: ReactNode;
	footer?: ReactNode;
}

export function AuthShell({
	eyebrow,
	title,
	description,
	children,
	footer,
}: AuthShellProps) {
	return (
		<div className="relative min-h-dvh overflow-hidden bg-background">
			<div
				className="pointer-events-none absolute inset-0 opacity-70"
				aria-hidden="true"
			>
				<div className="absolute -left-24 top-12 size-72 rounded-full bg-accent-blue/15 blur-3xl" />
				<div className="absolute -right-16 bottom-10 size-80 rounded-full bg-accent/20 blur-3xl" />
			</div>
			<div className="relative mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-2 lg:px-8">
				<section className="hidden lg:block" aria-hidden="true">
					<p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
						<GitBranch className="size-4 text-accent" aria-hidden="true" />
						Grafo institucional
					</p>
					<p className="mt-6 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-foreground">
						Acesso governado. Destino decidido no servidor.
					</p>
					<p className="mt-4 max-w-md text-sm text-muted-foreground">
						Sessão Better Auth, memberships reais e fail-closed para PLATFORM e
						partner. Nenhum console abre por palpite do cliente.
					</p>
					<div className="mt-10 overflow-hidden rounded-2xl border border-border bg-surface/80 p-4">
						<InstitutionalTicker />
					</div>
				</section>
				<main
					id="main-content"
					className="motion-enter rounded-2xl border border-border bg-surface/90 p-6 shadow-[var(--shadow-md,0_4px_24px_rgb(0_0_0_/_35%))] sm:p-8"
				>
					<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
						{eyebrow}
					</p>
					<h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground">
						{title}
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">{description}</p>
					<div className="mt-6">{children}</div>
					{footer ? <div className="mt-6 text-sm text-muted-foreground">{footer}</div> : null}
				</main>
			</div>
		</div>
	);
}
