import {
	Activity,
	Building2,
	LayoutDashboard,
	Link2,
	Menu,
	Settings,
	Users,
	X,
} from "lucide-react";
import { useState } from "react";
import { DashboardCard } from "./DashboardCard";

const navItems = [
	{ label: "Company Dashboard", href: "/", icon: LayoutDashboard, current: true },
	{ label: "Agentes", href: "#agents", icon: Users, current: false },
	{ label: "Connections", href: "#connections", icon: Link2, current: false },
	{ label: "Atividade", href: "#activity", icon: Activity, current: false },
	{ label: "Configurações", href: "#settings", icon: Settings, current: false },
];

const cLevelAgents = [
	{ role: "CEO Agent", status: "online" as const, mandate: "Coordenação missão/equipe" },
	{ role: "CIO", status: "online" as const, mandate: "Investimentos e estratégia" },
	{ role: "CRO", status: "degraded" as const, mandate: "Risco institucional" },
	{ role: "COO", status: "online" as const, mandate: "Operações" },
	{ role: "CFO", status: "pending" as const, mandate: "Finanças" },
	{ role: "CCO", status: "online" as const, mandate: "Governança" },
];

export function OwnerShell() {
	const [mobileNavOpen, setMobileNavOpen] = useState(false);

	return (
		<div className="flex min-h-dvh bg-background">
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-background"
			>
				Pular para o conteúdo principal
			</a>

			<aside
				className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex"
				aria-label="Navegação principal"
			>
				<div className="flex items-center gap-2 border-b border-border px-6 py-5">
					<Building2 className="size-6 text-accent" aria-hidden="true" />
					<div>
						<p className="text-sm font-semibold text-foreground">anxionOS</p>
						<p className="text-xs text-muted-foreground">Owner Console</p>
					</div>
				</div>
				<nav className="flex flex-1 flex-col gap-1 p-4" aria-label="Menu Owner">
					{navItems.map((item) => (
						<a
							key={item.label}
							href={item.href}
							className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer ${
								item.current
									? "bg-secondary text-foreground"
									: "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
							}`}
							aria-current={item.current ? "page" : undefined}
						>
							<item.icon className="size-4 shrink-0" aria-hidden="true" />
							{item.label}
						</a>
					))}
				</nav>
			</aside>

			{mobileNavOpen ? (
				<div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu de navegação">
					<button
						type="button"
						className="absolute inset-0 bg-black/60 cursor-pointer"
						aria-label="Fechar menu"
						onClick={() => setMobileNavOpen(false)}
					/>
					<aside className="relative z-50 flex h-full w-64 flex-col bg-surface">
						<div className="flex items-center justify-between border-b border-border px-4 py-4">
							<span className="text-sm font-semibold">anxionOS</span>
							<button
								type="button"
								className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary cursor-pointer"
								aria-label="Fechar menu"
								onClick={() => setMobileNavOpen(false)}
							>
								<X className="size-5" />
							</button>
						</div>
						<nav className="flex flex-col gap-1 p-4" aria-label="Menu Owner mobile">
							{navItems.map((item) => (
								<a
									key={item.label}
									href={item.href}
									className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary cursor-pointer"
									onClick={() => setMobileNavOpen(false)}
								>
									<item.icon className="size-4" aria-hidden="true" />
									{item.label}
								</a>
							))}
						</nav>
					</aside>
				</div>
			) : null}

			<div className="flex min-w-0 flex-1 flex-col">
				<header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm lg:px-8">
					<div className="flex items-center gap-3">
						<button
							type="button"
							className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary lg:hidden cursor-pointer"
							aria-label="Abrir menu de navegação"
							aria-expanded={mobileNavOpen}
							onClick={() => setMobileNavOpen(true)}
						>
							<Menu className="size-5" />
						</button>
						<div>
							<h1 className="text-lg font-semibold text-foreground">Company Dashboard</h1>
							<p className="text-sm text-muted-foreground">Visão institucional — Owner</p>
						</div>
					</div>
					<div className="hidden items-center gap-2 sm:flex" role="status" aria-label="Status da API">
						<span className="text-xs text-muted-foreground">API</span>
						<span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent">
							<span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
							localhost:3000
						</span>
					</div>
				</header>

				<main id="main-content" className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
					<div className="mx-auto max-w-7xl space-y-8">
						<section aria-labelledby="company-overview-heading">
							<h2 id="company-overview-heading" className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
								Empresa
							</h2>
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								<DashboardCard
									title="Empresa Demo Ltda."
									description="Tenant principal — sandbox institucional"
									icon={Building2}
									status="online"
									statusLabel="Ativo"
								>
									<dl className="grid grid-cols-2 gap-2 text-xs">
										<div>
											<dt className="text-muted-foreground">Tenant ID</dt>
											<dd className="font-mono text-foreground">tn_demo_001</dd>
										</div>
										<div>
											<dt className="text-muted-foreground">Plano</dt>
											<dd className="text-foreground">Institutional</dd>
										</div>
									</dl>
								</DashboardCard>

								<DashboardCard
									title="Capital sob governança"
									description="Agregado autorizado pelo grafo"
									icon={Activity}
									status="pending"
									statusLabel="Aguardando P03"
								>
									<p className="font-mono text-2xl font-semibold text-foreground tabular-nums">—</p>
									<p className="mt-1 text-xs">Projeção após Graph Kernel (P03)</p>
								</DashboardCard>

								<DashboardCard
									title="Connections readiness"
									description="Integrações e bindings institucionais"
									icon={Link2}
									status="degraded"
									statusLabel="Parcial"
								>
									<ul className="space-y-1.5 text-xs" aria-label="Status das connections">
										<li className="flex justify-between">
											<span>PostgreSQL</span>
											<span className="text-accent">Pronto</span>
										</li>
										<li className="flex justify-between">
											<span>Neo4j</span>
											<span className="text-accent">Pronto</span>
										</li>
										<li className="flex justify-between">
											<span>NATS</span>
											<span className="text-amber-400">Configurando</span>
										</li>
									</ul>
								</DashboardCard>
							</div>
						</section>

						<section aria-labelledby="c-level-heading" id="agents">
							<h2 id="c-level-heading" className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
								Agentes C-Level
							</h2>
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{cLevelAgents.map((agent) => (
									<DashboardCard
										key={agent.role}
										title={agent.role}
										description={agent.mandate}
										icon={Users}
										status={agent.status}
									/>
								))}
							</div>
						</section>
					</div>
				</main>

				<footer className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground lg:px-8">
					anxionOS P07 — Owner Console shell · Dados placeholder até integração com API
				</footer>
			</div>
		</div>
	);
}
