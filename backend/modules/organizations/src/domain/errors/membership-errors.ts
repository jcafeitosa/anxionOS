export class MembershipRevisionConflictError extends Error {
	constructor() {
		super("Membership revision conflict");
		this.name = "MembershipRevisionConflictError";
	}
}

/**
 * Violacao de um dos indices unicos **de negocio** de
 * `organizations_memberships` (`0001_organizations_membership_indexes.sql`):
 *
 * - `..._agency_principal_active_uidx` — o principal ja' tem vinculo ativo;
 * - `..._agency_email_invited_uidx` — ja' existe convite pendente para o e-mail;
 * - `..._one_owner_active_uidx` — a Agency ja' tem outro owner ativo.
 *
 * Existe porque o `23505` cru subia ate' o boundary como **500**. Dois caminhos o
 * tornaram alcancavel pela API: a transicao `revoked -> active` (D-ORG-046) na
 * reativacao do vinculo antigo, e a corrida de convites duplicados para o mesmo
 * e-mail (F-01 dos gates G3/G4/G5 da ANX-460).
 *
 * O nome nao fala em "active membership" de proposito: o mesmo erro cobre o
 * indice de convite pendente, e a mensagem ao cliente e' derivada da `constraint`
 * em `saveWithRevisionConflictMapping` (F-2 do G4 / LOW do G2).
 */
export class MembershipUniquenessConflictError extends Error {
	readonly constraint: MembershipConflictConstraint;

	constructor(constraint: MembershipConflictConstraint) {
		super(`Membership uniqueness conflict (${constraint})`);
		this.name = "MembershipUniquenessConflictError";
		this.constraint = constraint;
	}
}

/** Indices unicos de membership cuja violacao e' conflito de negocio. */
export const MEMBERSHIP_CONFLICT_CONSTRAINTS = [
	"organizations_memberships_agency_principal_active_uidx",
	"organizations_memberships_agency_email_invited_uidx",
	"organizations_memberships_one_owner_active_uidx",
] as const;

export type MembershipConflictConstraint =
	(typeof MEMBERSHIP_CONFLICT_CONSTRAINTS)[number];
