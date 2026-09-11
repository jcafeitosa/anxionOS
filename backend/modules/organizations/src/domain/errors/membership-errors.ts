export class MembershipRevisionConflictError extends Error {
	constructor() {
		super("Membership revision conflict");
		this.name = "MembershipRevisionConflictError";
	}
}

/**
 * O principal ja' tem outro vinculo **ativo** na mesma Agency, ou a Agency ja'
 * tem outro owner ativo. Lancada pelo repositorio quando o `INSERT`/`UPDATE`
 * viola um dos indices parciais de `organizations_memberships`
 * (`0001_organizations_membership_indexes.sql`).
 *
 * Existe porque a violacao crua do Postgres (`23505`) subia ate' o boundary como
 * **500** — a transicao `revoked -> active` (D-ORG-046) tornou isso alcancavel
 * pela API: revogar um membro, reconvida-lo (novo vinculo ativo) e reativar o
 * vinculo antigo colidia com `..._agency_principal_active_uidx`
 * (achado F-01 do G5/G3/G4, ANX-460). A aplicacao converte em
 * `ORG_MEMBERSHIP_EXISTS` (409).
 */
export class MembershipAlreadyActiveError extends Error {
	readonly constraint: string;

	constructor(constraint: string) {
		super(`Membership conflicts with active membership (${constraint})`);
		this.name = "MembershipAlreadyActiveError";
		this.constraint = constraint;
	}
}
