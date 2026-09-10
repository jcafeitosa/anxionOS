import { useEffect, useState } from "react";
import {
	fetchPostLoginContext,
	pathForPostLogin,
	PostLoginContextUnavailableError,
} from "../lib/auth";
import { HonestState } from "./shell/HonestState";

interface PostLoginRouterProps {
	mode?: "home" | "login" | "landing";
}

export function PostLoginRouter({ mode = "home" }: PostLoginRouterProps) {
	const [error, setError] = useState<"stale" | null>(null);

	useEffect(() => {
		let cancelled = false;
		fetchPostLoginContext()
			.then((context) => {
				if (cancelled) {
					return;
				}
				const destination = pathForPostLogin(context);
				if (mode === "login" && destination === "/login") {
					return;
				}
				if (mode === "landing" && !context.authenticated) {
					return;
				}
				if (window.location.pathname !== destination) {
					window.location.replace(destination);
				}
			})
			.catch((cause: unknown) => {
				if (cancelled) {
					return;
				}
				if (cause instanceof PostLoginContextUnavailableError) {
					if (mode === "landing") {
						return;
					}
					setError("stale");
					return;
				}
				if (mode === "home") {
					window.location.replace("/login");
					return;
				}
				if (mode === "landing") {
					return;
				}
				setError("stale");
			});
		return () => {
			cancelled = true;
		};
	}, [mode]);

	if (error === "stale") {
		return (
			<HonestState
				kind="stale"
				title="Contexto de acesso indisponível"
				description="Não foi possível confirmar a sessão neste momento. Tente de novo; nenhum console será aberto sem decisão autoritativa."
				actionHref="/login"
				actionLabel="Ir para o login"
			/>
		);
	}

	if (mode === "login" || mode === "landing") {
		return null;
	}

	return (
		<HonestState
			kind="loading"
			title="Confirmando acesso"
			description="Carregando o destino autorizado pela sessão."
		/>
	);
}
