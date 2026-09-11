import { useEffect, useId, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { authClient, fetchPostLoginContext, pathForPostLogin } from "../../lib/auth";
import { AuthShell } from "./AuthShell";

export function LoginForm() {
	const emailId = useId();
	const passwordId = useId();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [hydrated, setHydrated] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setHydrated(true);
	}, []);

	async function onSubmit(event: { preventDefault: () => void }) {
		event.preventDefault();
		setSubmitting(true);
		setError(null);
		const result = await authClient.signIn.email({
			email,
			password,
			callbackURL: "/",
		});
		if (result.error) {
			setSubmitting(false);
			setError(
				"Não foi possível entrar: e-mail ou senha não conferem. Confira as credenciais ou use uma conta de seed local.",
			);
			return;
		}
		try {
			const context = await fetchPostLoginContext();
			window.location.assign(pathForPostLogin(context));
		} catch {
			setSubmitting(false);
			setError(
				"Sessão criada, mas GET /v1/auth/post-login-context não respondeu. Confirme que a API subiu com BETTER_AUTH_SECRET e tente de novo.",
			);
		}
	}

	return (
		<AuthShell
			eyebrow="Sessão"
			title="Entrar"
			description="O destino após o login vem do loader autoritativo, não de um papel escolhido neste formulário."
		>
		<form
			className="flex flex-col gap-5"
			method="post"
			action="/login"
			onSubmit={onSubmit}
			noValidate
		>
			<div className="flex flex-col gap-2">
				<label htmlFor={emailId} className="text-sm font-medium text-foreground">
					E-mail
				</label>
				<input
					id={emailId}
					name="email"
					type="email"
					autoComplete="username"
					required
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					className="min-h-11 rounded-lg border border-border bg-surface px-3 text-foreground focus:border-accent/50 focus:ring-2 focus:ring-ring"
				/>
			</div>
			<div className="flex flex-col gap-2">
				<label htmlFor={passwordId} className="text-sm font-medium text-foreground">
					Senha
				</label>
				<div className="flex gap-2">
					<input
						id={passwordId}
						name="password"
						type={showPassword ? "text" : "password"}
						autoComplete="current-password"
						required
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-foreground focus:border-accent/50 focus:ring-2 focus:ring-ring"
					/>
					<button
						type="button"
						className="min-h-11 min-w-11 cursor-pointer rounded-lg border border-border px-3 text-sm text-foreground"
						onClick={() => setShowPassword((value) => !value)}
						aria-pressed={showPassword}
						aria-controls={passwordId}
						aria-label={showPassword ? "Ocultar caracteres" : "Mostrar caracteres"}
					>
						{showPassword ? "Ocultar" : "Mostrar"}
					</button>
				</div>
			</div>
			{error ? (
				<p className="text-sm text-destructive" role="alert">
					{error}
				</p>
			) : null}
			<button
				type="submit"
				disabled={!hydrated || submitting}
				className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent px-4 font-semibold text-on-accent transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{submitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
				{submitting ? "Entrando…" : "Entrar"}
			</button>
			<div className="flex flex-col gap-2 text-sm">
				<a href="/register" className="inline-flex min-h-11 items-center text-foreground">
					Criar conta
				</a>
				<a href="/forgot-password" className="inline-flex min-h-11 items-center text-foreground">
					Esqueci a senha
				</a>
			</div>
		</form>
		</AuthShell>
	);
}
