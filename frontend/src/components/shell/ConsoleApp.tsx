import { Shield } from "lucide-react";
import { useEffect, useState } from "react";
import {
	canAccessConsole,
	fetchPostLoginContext,
	pathForPostLogin,
	type ConsoleKind,
	type PostLoginAuthContext,
	PostLoginContextUnavailableError,
} from "../../lib/auth";
import { ConsoleSidebar } from "./ConsoleSidebar";
import { DecisionTrail } from "./DecisionTrail";
import { HonestState } from "./HonestState";
import { OperatorDashboard } from "./OperatorDashboard";
import { OwnerDashboard } from "./OwnerDashboard";
import { PartnerDashboard } from "./PartnerDashboard";
import { PlatformDashboard } from "./PlatformDashboard";

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

export function ConsoleApp({ kind, agencyId }: ConsoleAppProps) {
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

	const roleLabel = context.decision.role ?? kind;

	return (
		<ConsoleSidebar kind={kind} agencyId={agencyId} context={context}>
			<div className="flex min-w-0 flex-1 flex-col">
				<header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm lg:px-8">
					<div>
						<h1 className="text-lg font-semibold text-foreground">{titles[kind]}</h1>
						<p className="text-sm text-muted-foreground">
							{agencyId ? `Agência ${agencyId}` : "Escopo institucional"} · {roleLabel}
						</p>
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
						) : kind === "operator" && agencyId ? (
							<OperatorDashboard context={context} agencyId={agencyId} />
						) : kind === "platform" ? (
							<PlatformDashboard platformAccess={context.platformAccess === true} />
						) : (
							<HonestState
								kind="denied"
								titleAs="h2"
								title="Console indisponível"
								description="O contexto de autorização não corresponde a um console navegável."
							/>
						)}
					</div>
				</main>

				<footer className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground lg:px-8">
					anxionOS · {titles[kind]} ·{" "}
					{kind === "partner" ? "partner console ANX-167" : "shells honestos ANX-297"}
				</footer>
			</div>
		</ConsoleSidebar>
	);
}
