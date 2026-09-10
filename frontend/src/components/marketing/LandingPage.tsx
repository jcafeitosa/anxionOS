import { GitBranch, Scale, ShieldCheck } from "lucide-react";
import { InstitutionalTicker } from "./InstitutionalTicker";
import { LoginConsoleDemo } from "./LoginConsoleDemo";

const FEATURES = [
	{
		icon: GitBranch,
		title: "Grafo institucional",
		body: "Agências, agentes e decisões ligados com autoridade explícita — não um dashboard decorativo.",
	},
	{
		icon: ShieldCheck,
		title: "Acesso fail-closed",
		body: "PLATFORM e partner só existem com grant. Sem grant, o loader não abre esses consoles.",
	},
	{
		icon: Scale,
		title: "Destino no servidor",
		body: "O cliente não escolhe o console. GET /v1/auth/post-login-context decide owner, operator, onboarding ou negação.",
	},
] as const;

export function LandingPage() {
	return (
		<div className="relative min-h-dvh overflow-hidden bg-background">
			<div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_20%_20%,rgb(59_130_246/0.12),transparent_40%),radial-gradient(circle_at_80%_10%,rgb(249_115_22/0.14),transparent_36%)]" />
			<header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
				<div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-4 px-4">
					<a href="/" className="text-sm font-semibold text-foreground">
						anxionOS
					</a>
					<nav className="flex items-center gap-2" aria-label="Acesso">
						<a
							href="/login"
							className="inline-flex min-h-11 cursor-pointer items-center px-3 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
						>
							Entrar
						</a>
						<a
							href="/register"
							className="inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent transition-opacity duration-200 hover:opacity-90"
						>
							Criar conta
						</a>
					</nav>
				</div>
			</header>

			<main id="main-content" className="relative mx-auto max-w-6xl px-4 pb-20 pt-16">
				<section className="grid items-center gap-12 lg:grid-cols-2">
					<div>
						<p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
							Investimento autônomo governado
						</p>
						<h1 className="mt-4 font-[family-name:var(--font-display)] text-[clamp(2.4rem,5vw,4.2rem)] font-semibold leading-[1.05] tracking-tight text-foreground">
							Investimentos autônomos com governança institucional
						</h1>
						<p className="mt-5 max-w-xl text-lg text-muted-foreground">
							Agentes, capital e decisões conectados em um grafo auditável — para
							owners que exigem controle real.
						</p>
						<div className="mt-8 flex flex-wrap gap-3">
							<a
								href="/register"
								className="inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-accent px-5 font-semibold text-on-accent"
							>
								Criar conta
							</a>
							<a
								href="/login"
								className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-border px-5 font-semibold text-foreground"
							>
								Entrar
							</a>
						</div>
					</div>
					<LoginConsoleDemo />
				</section>

				<div className="mt-16 overflow-hidden rounded-2xl border border-border bg-surface/70 px-4 py-3">
					<InstitutionalTicker />
				</div>

				<section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-labelledby="features-heading">
					<h2 id="features-heading" className="sr-only">
						Capacidades
					</h2>
					{FEATURES.map((feature) => (
						<article
							key={feature.title}
							className="rounded-2xl border border-border bg-surface/80 p-6"
						>
							<feature.icon className="size-5 text-accent" aria-hidden="true" />
							<h3 className="mt-4 text-lg font-semibold text-foreground">{feature.title}</h3>
							<p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
						</article>
					))}
				</section>
			</main>

			<footer className="border-t border-border px-4 py-8 text-sm text-muted-foreground">
				<div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
					<p>© anxionOS</p>
					<nav className="flex gap-4" aria-label="Rodapé">
						<a href="/login" className="min-h-11 cursor-pointer py-2">
							Login
						</a>
						<a href="/register" className="min-h-11 cursor-pointer py-2">
							Cadastro
						</a>
					</nav>
				</div>
			</footer>
		</div>
	);
}
