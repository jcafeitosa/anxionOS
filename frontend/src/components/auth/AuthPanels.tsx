import { useEffect, useState } from "react";
import {
	authClient,
	consolePathForMembership,
	fetchPostLoginContext,
	pathForPostLogin,
	type PostLoginAuthContext,
	PostLoginContextUnavailableError,
} from "../../lib/auth";
import { HonestState } from "../shell/HonestState";
import { AuthShell } from "./AuthShell";

type PanelGate = "denied" | "select" | "onboarding";

function allowsGate(gate: PanelGate, context: PostLoginAuthContext): boolean {
	if (gate === "denied") {
		return !context.authenticated || context.decision.kind === "denied";
	}
	if (gate === "select") {
		return context.decision.kind === "select_organization";
	}
	return (
		context.decision.kind === "onboarding" &&
		!context.onboardingState.needsMfa &&
		!context.onboardingState.needsEmailVerification
	);
}

function useRequiredContext(gate: PanelGate) {
	const [context, setContext] = useState<PostLoginAuthContext | null>(null);
	const [mode, setMode] = useState<"loading" | "stale" | "ready">("loading");

	useEffect(() => {
		let cancelled = false;
		fetchPostLoginContext()
			.then((loaded) => {
				if (cancelled) {
					return;
				}
				if (!allowsGate(gate, loaded)) {
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
	}, [gate]);

	return { context, mode };
}

export function AccessDeniedPanel() {
	const { context, mode } = useRequiredContext("denied");
	if (mode === "stale") {
		return (
			<HonestState
				kind="stale"
				title="Não foi possível confirmar o acesso"
				description="O loader pós-login não respondeu. Nenhum console será aberto por palpite."
				actionHref="/login"
				actionLabel="Voltar ao login"
			/>
		);
	}
	if (mode !== "ready" || !context) {
		return (
			<HonestState
				kind="loading"
				title="Verificando autorização"
				description="Consultando o contexto autoritativo da sessão."
			/>
		);
	}
	if (!context.authenticated) {
		window.location.replace("/login");
		return null;
	}
	return (
		<HonestState
			kind="denied"
			title="Acesso não autorizado"
			description={`Não há um console permitido para esta identidade (${context.decision.reason}). Grants PLATFORM e vínculos partner não são inferidos.`}
			actionHref="/login"
			actionLabel="Sair e entrar de novo"
		/>
	);
}

export function SelectOrganizationPanel() {
	const { context, mode } = useRequiredContext("select");
	if (mode === "stale") {
		return (
			<HonestState
				kind="stale"
				title="Não foi possível listar organizações"
				description="Sem contexto autoritativo não há escolha de agência."
				actionHref="/login"
				actionLabel="Voltar ao login"
			/>
		);
	}
	if (mode !== "ready" || !context) {
		return (
			<HonestState
				kind="loading"
				title="Carregando organizações"
				description="Aguardando memberships ativas da sessão."
			/>
		);
	}
	return (
		<section className="mx-auto w-full max-w-lg rounded-2xl border border-border bg-surface p-8">
			<h1 className="text-2xl font-semibold">Escolher organização</h1>
			<p className="mt-2 text-sm text-muted-foreground">
				Há mais de uma membership ativa. O destino inicial não foi escolhido no
				cliente — selecione a agência autorizada.
			</p>
			<ul className="mt-6 flex flex-col gap-3">
				{context.membershipsActive.map((membership) => (
					<li key={`${membership.agencyId}-${membership.role}`}>
						<a
							href={consolePathForMembership(
								membership.agencyId,
								membership.role,
							)}
							className="flex min-h-11 cursor-pointer items-center justify-between rounded-lg border border-border px-4 py-3 text-sm hover:bg-secondary"
						>
							<span className="font-mono">{membership.agencyId}</span>
							<span className="text-muted-foreground">{membership.role}</span>
						</a>
					</li>
				))}
			</ul>
		</section>
	);
}

export function OnboardingPanel() {
	const { context, mode } = useRequiredContext("onboarding");
	if (mode === "stale") {
		return (
			<HonestState
				kind="stale"
				title="Onboarding indisponível"
				description="O servidor não confirmou o estado de convite ou organização."
				actionHref="/login"
				actionLabel="Voltar ao login"
			/>
		);
	}
	if (mode !== "ready" || !context) {
		return (
			<HonestState
				kind="loading"
				title="Carregando onboarding"
				description="Confirmando convites e memberships."
			/>
		);
	}
	const pending = context.membershipsPending;
	if (pending.length > 0) {
		return (
			<section className="mx-auto max-w-lg rounded-2xl border border-border bg-surface p-8">
				<h1 className="text-2xl font-semibold">Convite pendente</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Há convite(s) acionável(is). Aceite pelo fluxo de organizações; esta
					tela não inventa token nem agência.
				</p>
				<ul className="mt-6 space-y-2 text-sm">
					{pending.map((invite, index) => (
						<li key={`${invite.agencyId ?? "invite"}-${index}`} className="font-mono">
							{invite.agencyId ?? "agência não informada"} ·{" "}
							{invite.role ?? "papel indefinido"}
						</li>
					))}
				</ul>
			</section>
		);
	}
	return (
		<HonestState
			kind="pending"
			title="Organização ainda não vinculada"
			description="A sessão é válida, mas não há membership ativa nem grant PLATFORM/partner. Crie ou aceite um convite pelo fluxo institucional — este console não fabrica tenant."
			actionHref="/login"
			actionLabel="Voltar ao login"
		/>
	);
}

export function MfaPendingPanel() {
	return (
		<AuthShell
			eyebrow="MFA"
			title="MFA pendente"
			description="TOTP não está montado neste composition root. Nenhum QR code fake será exibido."
		>
			<p className="text-sm text-muted-foreground">
				O contexto exige verificação em duas etapas, mas o desafio TOTP não está
				montado neste composition root (Better Auth sem plugin twoFactor).
			</p>
			<a
				href="/login"
				className="mt-6 inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-foreground"
			>
				Voltar ao login
			</a>
		</AuthShell>
	);
}

export function VerifyEmailPanel() {
	const [mode, setMode] = useState<"loading" | "stale" | "ready">("loading");
	const [smtpEnabled, setSmtpEnabled] = useState(false);
	const [email, setEmail] = useState<string | null>(null);
	const [resendState, setResendState] = useState<
		"idle" | "sending" | "sent" | "error"
	>("idle");

	useEffect(() => {
		let cancelled = false;
		fetchPostLoginContext()
			.then((loaded) => {
				if (cancelled) {
					return;
				}
				if (!loaded.authenticated) {
					window.location.replace("/login");
					return;
				}
				if (!loaded.onboardingState.needsEmailVerification) {
					window.location.replace(pathForPostLogin(loaded));
					return;
				}
				setEmail(loaded.principal?.email ?? null);
				setSmtpEnabled(loaded.emailDelivery?.verificationConfigured === true);
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
	}, []);

	async function onResend() {
		if (!email) {
			return;
		}
		setResendState("sending");
		const result = await authClient.sendVerificationEmail({
			email,
			callbackURL: "/",
		});
		if (result.error) {
			setResendState("error");
			return;
		}
		setResendState("sent");
	}

	if (mode === "stale") {
		return (
			<HonestState
				kind="stale"
				title="Não foi possível confirmar o e-mail"
				description="O loader pós-login não respondeu. Nenhum clique nesta página confirma o cadastro."
				actionHref="/login"
				actionLabel="Voltar ao login"
			/>
		);
	}

	if (mode !== "ready") {
		return (
			<HonestState
				kind="loading"
				title="Verificando e-mail"
				description="Consultando se o SMTP de verificação está habilitado neste servidor."
			/>
		);
	}

	if (!smtpEnabled) {
		return (
			<AuthShell
				eyebrow="E-mail"
				title="E-mail não verificado"
				description="SMTP/desafio de verificação não está habilitado. Esta página não simula confirmação."
			>
				<p className="text-sm text-muted-foreground">
					O destino do dashboard está bloqueado até a verificação de e-mail. O envio
					SMTP/desafio não está habilitado neste servidor.
				</p>
				<a
					href="/login"
					className="mt-6 inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-foreground"
				>
					Voltar ao login
				</a>
			</AuthShell>
		);
	}

	return (
		<AuthShell
			eyebrow="E-mail"
			title="Aguardando confirmação"
			description="Enviamos um link real para o seu e-mail. Esta página não confirma o cadastro — só o clique no link."
		>
			<p className="text-sm text-muted-foreground" role="status">
				Abra a mensagem de verificação e use o link. Depois disso o dashboard
				destrava (EMAIL_UNVERIFIED some no loader).
			</p>
			{email ? (
				<p className="mt-3 text-sm text-foreground">Destino: {email}</p>
			) : null}
			<button
				type="button"
				onClick={() => {
					void onResend();
				}}
				disabled={resendState === "sending"}
				className="mt-6 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-accent px-4 font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-60"
			>
				{resendState === "sending" ? "Reenviando…" : "Reenviar e-mail"}
			</button>
			{resendState === "sent" ? (
				<p className="mt-3 text-sm text-foreground" role="status">
					Pedido de reenvio aceito. Confira a caixa de entrada (e o spam).
				</p>
			) : null}
			{resendState === "error" ? (
				<p className="mt-3 text-sm text-destructive" role="alert">
					Não foi possível reenviar. Tente de novo ou peça SMTP_PASS ao operador.
				</p>
			) : null}
			<a
				href="/login"
				className="mt-6 inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-foreground"
			>
				Voltar ao login
			</a>
		</AuthShell>
	);
}
