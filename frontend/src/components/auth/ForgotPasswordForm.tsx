import { useId, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { AuthShell } from "./AuthShell";

export function ForgotPasswordForm() {
	const emailId = useId();
	const [email, setEmail] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	async function onSubmit(event: { preventDefault: () => void }) {
		event.preventDefault();
		setSubmitting(true);
		setMessage(null);
		await new Promise((resolve) => window.setTimeout(resolve, 180));
		setSubmitting(false);
		setMessage(
			"SMTP não está montado neste servidor. Nenhum e-mail foi enviado. Peça ao operador para redefinir a senha pelo canal institucional ou use uma conta de seed local.",
		);
	}

	return (
		<AuthShell
			eyebrow="Recuperação"
			title="Esqueci a senha"
			description="SMTP não está habilitado neste servidor. A página não finge que um e-mail saiu."
		>
		<form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
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
				<p className="text-xs text-muted-foreground">
					Recuperação por e-mail só existe quando o composition root tiver SMTP.
				</p>
			</div>
			<p className="text-sm text-muted-foreground" role="status">
				{message ??
					"SMTP não está montado neste servidor. Nenhum e-mail será enviado até o composition root ter provedor de correio."}
			</p>
			<button
				type="submit"
				disabled={submitting}
				className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent px-4 font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-60"
			>
				{submitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
				{submitting ? "Verificando…" : "Solicitar recuperação"}
			</button>
			<a href="/login" className="inline-flex min-h-11 items-center text-sm text-foreground">
				Voltar ao login
			</a>
		</form>
		</AuthShell>
	);
}
