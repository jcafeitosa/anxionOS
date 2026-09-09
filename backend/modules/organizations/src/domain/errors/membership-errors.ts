export class MembershipRevisionConflictError extends Error {
	constructor() {
		super("Membership revision conflict");
		this.name = "MembershipRevisionConflictError";
	}
}
