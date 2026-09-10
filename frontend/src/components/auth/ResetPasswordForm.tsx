import { AuthShell } from "./AuthShell";

export function ResetPasswordForm() {
	return (
		<AuthShell
			eyebrow="Recuperação"
			title="Redefinir senha"
			description="Sem token SMTP válido não há troca de senha. Nada é simulado."
		>
		<p className="text-sm text-muted-foreground" role="status">
			O token de redefinição exige SMTP e o endpoint de reset do Better Auth.
			Nenhum deles está montado neste composition root. Esta página não simula
			troca de senha.
		</p>
		<a href="/login" className="mt-6 inline-flex min-h-11 items-center text-sm text-foreground">
			Voltar ao login
		</a>
		</AuthShell>
	);
}
