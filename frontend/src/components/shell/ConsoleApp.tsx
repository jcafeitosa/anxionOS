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
import {
	canAccessConsole,
	fetchPostLoginContext,
	pathForPostLogin,
	type ConsoleKind,
	type PostLoginAuthContext,
	PostLoginContextUnavailableError,
} from "../../lib/auth";
import { membershipForAgency } from "../../lib/owner-dashboard";
import { ArchifyCanvas } from "./ArchifyCanvas";
import { DecisionTrail } from "./DecisionTrail";
import { HonestState } from "./HonestState";
import { OwnerDashboard } from "./OwnerDashboard";
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

function RoleArchifyDashboard({
	kind,
	context,
	agencyId,
}: {
	kind: "operator" | "platform";
	context: PostLoginAuthContext;
	agencyId?: string;
}) {
	const membership = agencyId ? membershipForAgency(context, agencyId) : null;
	const testPrefix = kind === "operator" ? "operator" : "platform";
	return (
		<ArchifyCanvas
			title={
				kind === "operator"
					? "anxionOS — visão operator"
					: "anxionOS — visão platform"
			}
			testId={`${testPrefix}-dashboard`}
			defaultSelectedId="frontend"
			passport={() => (
				<div className="flex flex-col gap-4 border-t border-border pt-4">
					<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Dados do loader
					</p>
					<dl className="grid gap-2 text-xs" data-testid={`${testPrefix}-membership`}>
						<div>
							<dt className="text-muted-foreground">agencyId</dt>
							<dd className="break-all font-mono text-foreground">
								{agencyId ?? "escopo PLATFORM — sem agencyId"}
							</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">role</dt>
							<dd className="font-mono text-foreground">
								{membership?.role ?? context.decision.kind}
							</dd>
						</div>
					</dl>
					<p className="text-sm" data-testid={`${testPrefix}-platform-grant`}>
						{context.platformAccess === true
							? "O loader autorizou acesso PLATFORM."
							: "platformAccess=false — console /platform permanece negado."}
					</p>
					<p
						className="text-sm text-muted-foreground"
						data-testid={`${testPrefix}-partner-grant`}
					>
						{context.partnerAccess === true
							? "O loader autorizou acesso partner."
							: "partnerAccess=false — console /partner permanece negado."}
					</p>
				</div>
			)}
			footer={
				<section aria-labelledby={`${testPrefix}-empty-heading`} id="team">
					<h2
						id={`${testPrefix}-empty-heading`}
						className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
					>
						Dados operacionais
					</h2>
					<div data-testid={`${testPrefix}-operational-empty`}>
						<HonestState
							kind="empty"
							titleAs="h3"
							title="Este console não lista Owner capabilities"
							description="Operator/Platform não consomem GET /v1/agencies/:agencyId/agents. ANX-153 (portfólio) permanece aberto; nenhum tenant demo ou número financeiro é inventado."
						/>
					</div>
				</section>
			}
		/>
	);
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
			<main id="main-content" className="flex min-h-dvh items-center px-4">
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
			<main id="main-content" className="flex min-h-dvh items-center px-4">
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
								<X className="size-5" aria-hidden="true" />
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
							<Menu className="size-5" aria-hidden="true" />
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
						) : kind === "owner" && agencyId ? (
							<OwnerDashboard context={context} agencyId={agencyId} />
						) : (
							<RoleArchifyDashboard
								kind={kind === "platform" ? "platform" : "operator"}
								context={context}
								agencyId={agencyId}
							/>
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
