import { z } from "zod";
export const governanceScopeKindSchema = z.enum(["agency", "platform"]);
export const grantStatusSchema = z.enum(["active", "revoked", "expired"]);

/** Explicit PLATFORM console grant. Never inferred from agency membership (ANX-166). */
export const PLATFORM_CONSOLE_CAPABILITY = "console.platform";

/**
 * ANX-462 — identificador canonico do escopo PLATAFORMA.
 *
 * `governance_grants.scope_id` e `NOT NULL`, entao autoridade de plataforma nao
 * pode ser representada por escopo nulo: precisa de escopo de primeira classe.
 * O valor e' o mesmo que o dev seed ja usava para a plataforma, entao nenhum
 * dado existente muda de significado e o literal deixa de existir fora daqui.
 * Nao e' tenant nem agencia: e' identificador institucional (id bem-conhecido),
 * por isso constante nomeada com fonte documentada, nao valor de config.
 */
export const PLATFORM_SCOPE_ID = "abababab-abab-4aba-8aba-abababababab";

/**
 * ANX-462 — capabilities que so fazem sentido com escopo PLATFORM. `issueGrant`
 * rejeita emiti-las em escopo de agencia; antes desta regra um operador de
 * agencia emitia `console.platform` no proprio escopo e abria o console de
 * plataforma (testes afirmavam esse comportamento).
 */
export const PLATFORM_ONLY_CAPABILITIES: readonly string[] = [
	PLATFORM_CONSOLE_CAPABILITY,
];

export function isPlatformOnlyCapability(capability: string): boolean {
	return PLATFORM_ONLY_CAPABILITIES.includes(capability);
}
export const mandateKindSchema = z.enum(["ceo", "operator", "audit"]);
export const mandateStatusSchema = z.enum(["active", "suspended", "revoked"]);
export const changeProposalKindSchema = z.enum([
	"SOFTWARE",
	"INSTITUTIONAL",
	"HIERARCHY_MODE",
]);
export const changeProposalStatusSchema = z.enum([
	"pending",
	"approved",
	"rejected",
	"superseded",
]);
export const approvalDecisionSchema = z.enum(["APPROVED", "REJECTED"]);

export type GovernanceScopeKind = z.infer<typeof governanceScopeKindSchema>;
export type GrantStatus = z.infer<typeof grantStatusSchema>;
export type MandateKind = z.infer<typeof mandateKindSchema>;
export type MandateStatus = z.infer<typeof mandateStatusSchema>;
export type ChangeProposalKind = z.infer<typeof changeProposalKindSchema>;
export type ChangeProposalStatus = z.infer<typeof changeProposalStatusSchema>;
export type ApprovalDecision = z.infer<typeof approvalDecisionSchema>;
