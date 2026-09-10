import { useEffect, useState } from "react";
import type { PostLoginAuthContext } from "./auth";
import {
	honestStateForPartnerError,
	loadPartnerConsoleSnapshot,
	PartnerConsoleFetchError,
	PartnerOrganizationUnresolvedError,
	type PartnerConsoleSnapshot,
} from "./partner-console";

export type PartnerConsoleHookState =
	| { status: "loading" }
	| { status: "unresolved"; reason: "no_membership" | "ambiguous_membership" }
	| { status: "error"; honestKind: "denied" | "empty" | "stale"; message: string }
	| { status: "ready"; snapshot: PartnerConsoleSnapshot };

export function usePartnerConsole(context: PostLoginAuthContext): PartnerConsoleHookState {
	const [state, setState] = useState<PartnerConsoleHookState>({ status: "loading" });

	useEffect(() => {
		let cancelled = false;
		setState({ status: "loading" });
		loadPartnerConsoleSnapshot(context)
			.then((snapshot) => {
				if (!cancelled) {
					setState({ status: "ready", snapshot });
				}
			})
			.catch((cause: unknown) => {
				if (cancelled) {
					return;
				}
				if (cause instanceof PartnerOrganizationUnresolvedError) {
					setState({ status: "unresolved", reason: cause.reason });
					return;
				}
				const honestKind = honestStateForPartnerError(cause);
				const message =
					cause instanceof PartnerConsoleFetchError
						? cause.message
						: cause instanceof Error
							? cause.message
							: "Falha ao carregar dados do parceiro";
				setState({ status: "error", honestKind, message });
			});
		return () => {
			cancelled = true;
		};
	}, [context]);

	return state;
}
