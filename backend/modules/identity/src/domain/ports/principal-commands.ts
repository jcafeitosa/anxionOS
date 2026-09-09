import type { NewPrincipal, Principal } from "../entities/principal";

export interface PrincipalCommandsPort {
	register(input: NewPrincipal): Promise<Principal>;
	suspend(principalId: string, reasonCode: string): Promise<Principal>;
	syncEmail(principalId: string, email: string): Promise<Principal>;
}
