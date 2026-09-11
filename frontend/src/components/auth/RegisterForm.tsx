import { useEffect, useId, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { authClient, fetchPostLoginContext, pathForPostLogin } from "../../lib/auth";
import { AuthShell } from "./AuthShell";

export function RegisterForm() {
	const nameId = useId();
	const emailId = useId();
	const passwordId = useId();
	const [name, setName] = useState("");
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
		const result = await authClient.signUp.email({
			name,
			email,
			password,
			callbackURL: "/",
		});
		if (result.error) {
			setSubmitting(false);
			setError(
				"Não foi possível criar a conta. Confira e-mail (formato válido) e senha (mínimo exigido pelo servidor) e tente de novo.",
			);
			return;
		}
		try {
			const context = await fetchPostLoginContext();
			window.location.assign(pathForPostLogin(context));
		} catch {
			setSubmitting(false);
			setError(
				"Conta criada, mas o loader pós-login não confirmou o destino. Entre de novo em /login.",
			);
		}
	}

	return (
		<AuthShell
			eyebrow="Cadastro"
			title="Criar conta"
			description="A conta nasce sem membership. O loader decide onboarding, seleção ou console — este formulário não escolhe papel."
		>
		<form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
			<div className="flex flex-col gap-2">
				<label htmlFor={nameId} className="text-sm font-medium text-foreground">
					Nome
				</label>
				<input
					id={nameId}
					name="name"
					type="text"
					autoComplete="name"
					required
					value={name}
					onChange={(event) => setName(event.target.value)}
					className="min-h-11 rounded-lg border border-border bg-surface px-3 text-foreground"
				/>
			</div>
			<div className="flex flex-col gap-2">
				<label htmlFor={emailId} className="text-sm font-medium text-foreground">
					E-mail
				</label>
				<input
					id={emailId}
					name="email"
					type="email"
					autoComplete="email"
					required
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					className="min-h-11 rounded-lg border border-border bg-surface px-3 text-foreground"
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
						autoComplete="new-password"
						required
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-foreground"
					/>
					<button
						type="button"
						className="min-h-11 min-w-11 cursor-pointer rounded-lg border border-border px-3 text-sm text-muted-foreground"
						onClick={() => setShowPassword((value) => !value)}
						aria-pressed={showPassword}
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
				className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent px-4 font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-60"
			>
				{submitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
				{submitting ? "Criando conta…" : "Criar conta"}
			</button>
			<a href="/login" className="inline-flex min-h-11 items-center text-sm text-foreground">
				Já tem conta? Entrar
			</a>
		</form>
		</AuthShell>
	);
}
