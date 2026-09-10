import {
	Activity,
	Building2,
	LayoutDashboard,
	Menu,
	Settings,
	Shield,
	Users,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardCard } from "../DashboardCard";
import {
	canAccessConsole,
	fetchPostLoginContext,
	pathForPostLogin,
	type ConsoleKind,
	type PostLoginAuthContext,
	PostLoginContextUnavailableError,
} from "../../lib/auth";
import { DecisionTrail } from "./DecisionTrail";
import { HonestState } from "./HonestState";
import { PartnerDashboard } from "./PartnerDashboard";

interface ConsoleAppProps {
	kind: ConsoleKind;
	agencyId?: string;
}

const titles: Record<ConsoleKind, string> = {
	owner: "Owner Console",
	operator: "Operator Console",
	platform: "Platform Console",
	partner: "Partner Console",
};

function navFor(kind: ConsoleKind, agencyId?: string) {
	const root =
		kind === "owner" && agencyId
			? `/agency/${agencyId}`
			: kind === "operator" && agencyId
				? `/operator/${agencyId}`
				: kind === "platform"
					? "/platform"
					: "/partner";
	return [
		{ label: "Visão geral", href: root, icon: LayoutDashboard, current: true },
		{ label: "Equipe", href: `${root}#team`, icon: Users, current: false },
		{ label: "Atividade", href: `${root}#activity`, icon: Activity, current: false },
		{ label: "Configurações", href: `${root}#settings`, icon: Settings, current: false },
	];
}

export function ConsoleApp({ kind, agencyId }: ConsoleAppProps) {
	const [mobileNavOpen, setMobileNavOpen] = useState(false);
	const [mode, setMode] = useState<"loading" | "ready" | "denied" | "stale">(
		"loading",
	);
	const [context, setContext] = useState<PostLoginAuthContext | null>(null);

	useEffect(() => {
		let cancelled = false;
		fetchPostLoginContext()
			.then((loaded) => {
				if (cancelled) {
					return;
				}
				if (!canAccessConsole(loaded, kind, agencyId)) {
					window.location.replace(pathForPostLogin(loaded));
					return;
				}
				setContext(loaded);
				setMode("ready");
			})
			.catch((cause: unknown) => {
				if (cancelled) {
					return;
				}
				if (cause instanceof PostLoginContextUnavailableError) {
					setMode("stale");
					return;
				}
				window.location.replace("/login");
			});
		return () => {
			cancelled = true;
		};
	}, [agencyId, kind]);

	if (mode === "stale") {
		return (
			<main className="flex min-h-dvh items-center px-4">
				<HonestState
					kind="stale"
					title="Contexto de autorização desatualizado"
					description="O console não será preenchido com dados locais. Recarregue quando o loader responder."
					actionHref="/login"
					actionLabel="Voltar ao login"
				/>
			</main>
		);
	}

	if (mode !== "ready" || !context) {
		return (
			<main className="flex min-h-dvh items-center px-4">
				<HonestState
					kind="loading"
					title="Abrindo console"
					description="Confirmando membership e decisão autoritativa."
				/>
			</main>
		);
	}

	const navItems = navFor(kind, agencyId);
	const roleLabel = context.decision.role ?? kind;

	return (
		<div className="flex min-h-dvh bg-background">
			<aside
				className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex"
				aria-label="Navegação principal"
			>
				<div className="flex items-center gap-2 border-b border-border px-6 py-5">
					<Building2 className="size-6 text-accent" aria-hidden="true" />
					<div>
						<p className="text-sm font-semibold text-foreground">anxionOS</p>
						<p className="text-xs text-muted-foreground">{titles[kind]}</p>
					</div>
				</div>
				<nav className="flex flex-1 flex-col gap-1 p-4" aria-label={`Menu ${titles[kind]}`}>
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
						<nav className="flex flex-col gap-1 p-4" aria-label="Menu mobile">
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
							<h1 className="text-lg font-semibold text-foreground">{titles[kind]}</h1>
							<p className="text-sm text-muted-foreground">
								{agencyId ? `Agência ${agencyId}` : "Escopo institucional"} · {roleLabel}
							</p>
						</div>
					</div>
					<div className="hidden items-center gap-2 sm:flex" role="status" aria-label="Sessão">
						<Shield className="size-4 text-accent" aria-hidden="true" />
						<span className="text-xs text-muted-foreground">
							{context.principal?.email ?? "sessão confirmada"}
						</span>
					</div>
				</header>

				<main id="main-content" className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
					<div className="mx-auto flex max-w-7xl flex-col gap-8">
						<DecisionTrail
							title="Trilha de autorização"
							steps={[
								{
									id: "login",
									type: "frontend",
									label: "Sessão",
									sublabel: "Better Auth",
								},
								{
									id: "loader",
									type: "backend",
									label:
										kind === "partner"
											? "partners-scoped loader"
											: "post-login-context",
									sublabel:
										kind === "partner"
											? "GET /v1/partners/organizations/:organizationId/*"
											: "GET /v1/auth/post-login-context",
								},
								{
									id: "console",
									type: "security",
									label: titles[kind],
									sublabel: `${context.decision.kind} · ${context.decision.reason}`,
									emphasis: true,
								},
							]}
						/>
						{kind === "partner" ? (
							<PartnerDashboard context={context} />
						) : (
							<>
								<section aria-labelledby="console-status-heading">
									<h2
										id="console-status-heading"
										className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
									>
										Estado do console
									</h2>
									<div className="grid gap-4 sm:grid-cols-2">
										<DashboardCard
											title="Acesso confirmado"
											description="Decisão vinda de GET /v1/auth/post-login-context — não do cliente."
											icon={Shield}
											status="online"
											statusLabel="Autorizado"
										>
											<dl className="grid gap-2 text-xs">
												<div>
													<dt className="text-muted-foreground">decision.kind</dt>
													<dd className="font-mono text-foreground">
														{context.decision.kind}
													</dd>
												</div>
												<div>
													<dt className="text-muted-foreground">reason</dt>
													<dd className="font-mono text-foreground">
														{context.decision.reason}
													</dd>
												</div>
											</dl>
										</DashboardCard>
										<DashboardCard
											title="Capacidades de produto"
											description="Agentes, portfólio e valuation não estão neste slice (ANX-143 / ANX-153)."
											icon={Activity}
											status="pending"
											statusLabel="Pendente"
										>
											<p className="text-sm">
												Placeholder P07 explícito: conteúdo operacional real só aparece quando a
												API existir. Nenhum C-level, tenant demo ou número financeiro é inventado
												aqui.
											</p>
										</DashboardCard>
									</div>
								</section>

								<section aria-labelledby="empty-heading" id="team">
									<h2
										id="empty-heading"
										className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
									>
										Dados operacionais
									</h2>
									<HonestState
										kind="empty"
										title="Nenhum dado autoritativo neste console"
										description="A API de agentes/posições ainda não alimenta esta superfície. O estado vazio é intencional."
									/>
								</section>
							</>
						)}
					</div>
				</main>

				<footer className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground lg:px-8">
					anxionOS · {titles[kind]} ·{" "}
					{kind === "partner" ? "partner console ANX-167" : "shells honestos ANX-297"}
				</footer>
			</div>
		</div>
	);
}
