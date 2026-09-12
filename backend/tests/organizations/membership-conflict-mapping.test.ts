import { describe, expect, test } from "bun:test";
import { throwMembershipUniquenessConflict } from "../../modules/organizations/src/application/command-support";
import { OrganizationCommandError } from "../../modules/organizations/src/application/errors";
import {
	MEMBERSHIP_CONFLICT_CONSTRAINTS,
	type MembershipConflictConstraint,
	MembershipUniquenessConflictError,
} from "../../modules/organizations/src/domain/errors/membership-errors";

/**
 * G2 INFO + F-G4-1 (G4) da ANX-460 — o mapeamento de conflito de membership tem
 * de ser **exaustivo** e **derivado da constraint**.
 *
 * Antes havia um `if/else` encadeado com um fallback silencioso: uma 4a
 * constraint adicionada a' allowlist cairia em **silencio** na mensagem de
 * "vinculo ativo" — exatamente o drift que a mensagem unica combateu. Este teste
 * falha se alguem ampliar a allowlist sem dar resposta propria a' constraint nova.
 */
function capture(
	error: MembershipUniquenessConflictError,
): OrganizationCommandError {
	let caught: unknown;
	try {
		throwMembershipUniquenessConflict(error);
	} catch (thrown) {
		caught = thrown;
	}
	expect(caught).toBeInstanceOf(OrganizationCommandError);
	return caught as OrganizationCommandError;
}

describe("throwMembershipUniquenessConflict — mapeamento exaustivo (ANX-460)", () => {
	test("toda constraint da allowlist tem resposta PROPRIA (sem fallback silencioso)", () => {
		// Se a allowlist ganhar uma entrada, este conjunto muda e o teste abaixo
		// passa a exigir uma resposta dedicada — o que so' acontece se o mapa
		// (`Record<MembershipConflictConstraint, ...>`) tambem ganhar a entrada.
		// Com o `Record`, esquecer a entrada e' erro de COMPILACAO; este teste
		// garante que as respostas sao DISTINTAS e nao um clone do fallback.
		const seen = new Map<string, number>();
		for (const constraint of MEMBERSHIP_CONFLICT_CONSTRAINTS) {
			const mapped = capture(new MembershipUniquenessConflictError(constraint));
			expect(mapped.organizationCode).toBeDefined();
			expect(mapped.statusCode).toBe(409);
			// `cause` preservada: a cadeia de diagnostico nao se perde (G3 INFO-1).
			expect(mapped.cause).toBeInstanceOf(MembershipUniquenessConflictError);
			seen.set(mapped.message, (seen.get(mapped.message) ?? 0) + 1);
		}
		expect(seen.size).toBe(MEMBERSHIP_CONFLICT_CONSTRAINTS.length);
	});

	test("conflito de convite pendente diz 'pending invite'", () => {
		const mapped = capture(
			new MembershipUniquenessConflictError(
				"organizations_memberships_agency_email_invited_uidx",
			),
		);
		expect(mapped.organizationCode).toBe("ORG_MEMBERSHIP_EXISTS");
		expect(mapped.message).toContain("pending invite");
	});

	test("conflito de vinculo ativo diz 'active membership'", () => {
		const mapped = capture(
			new MembershipUniquenessConflictError(
				"organizations_memberships_agency_principal_active_uidx",
			),
		);
		expect(mapped.organizationCode).toBe("ORG_MEMBERSHIP_EXISTS");
		expect(mapped.message).toContain("active membership");
	});

	test("conflito de owner unico vira ORG_OWNER_REQUIRED (nao MEMBERSHIP_EXISTS)", () => {
		const mapped = capture(
			new MembershipUniquenessConflictError(
				"organizations_memberships_one_owner_active_uidx",
			),
		);
		expect(mapped.organizationCode).toBe("ORG_OWNER_REQUIRED");
		expect(mapped.message).toContain("active owner");
	});
});

describe("throwMembershipUniquenessConflict — fallback explicito (ANX-493)", () => {
	test("constraint fora da uniao vira 409 ORG_MEMBERSHIP_EXISTS (nao TypeError/500)", () => {
		// Cast consciente APENAS em teste: injeta uma constraint que a uniao nao
		// conhece como se chegasse de reidratacao/evento ou de allowlist e mapa
		// dessincronizados. O `capture()` ja' falha se o tiro for TypeError cru.
		const mapped = capture(
			new MembershipUniquenessConflictError(
				"organizations_memberships_pkey" as MembershipConflictConstraint,
			),
		);
		expect(mapped.organizationCode).toBe("ORG_MEMBERSHIP_EXISTS");
		expect(mapped.statusCode).toBe(409);
		expect(mapped.message).toBe("Unclassified membership uniqueness conflict");
		// `cause` preservada tambem no caminho de fallback: diagnostico intacto.
		expect(mapped.cause).toBeInstanceOf(MembershipUniquenessConflictError);
	});
});
