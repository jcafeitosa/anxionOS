import {
	type RegisterPrincipalDeps,
	registerPrincipal,
	syncPrincipalEmail,
} from "@anxionos/identity";

export type IdentityBetterAuthDeps = RegisterPrincipalDeps;

export function createIdentityBetterAuthDatabaseHooks(
	deps: IdentityBetterAuthDeps,
) {
	return {
		session: {
			create: {
				before: async (session: { userId: string }) => {
					const principal = await deps.repository.findByAuthUserId(
						session.userId,
					);
					if (principal?.status === "suspended") {
						return false;
					}
				},
			},
		},
		user: {
			create: {
				after: async (user: { id: string; email: string }) => {
					await registerPrincipal(deps, {
						authUserId: user.id,
						email: user.email,
					});
				},
			},
			update: {
				after: async (user: { id: string; email: string }) => {
					const principal = await deps.repository.findByAuthUserId(user.id);
					if (!principal) {
						return;
					}
					await syncPrincipalEmail(deps, {
						principalId: principal.id,
						email: user.email,
					});
				},
			},
		},
	};
}
