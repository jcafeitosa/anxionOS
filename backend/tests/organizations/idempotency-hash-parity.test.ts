import { describe, expect, test } from "bun:test";
import { hashCommandPayload as hashGovernance } from "../../modules/governance/src/application/command-support";
import { hashCommandPayload as hashOrganizations } from "../../modules/organizations/src/application/command-support";

/**
 * G4-F4 / G2 (ANX-460) — `canonicalJson` + `hashCommandPayload` sao copias
 * byte-a-byte entre `organizations` e `governance`. A funcao e' sensivel a
 * seguranca (define o binding de intencao da `Idempotency-Key`), entao duas
 * copias que divirjam em silencio produziriam hashes diferentes para o mesmo
 * payload e quebrariam (ou afrouxariam) o replay. Este teste fixa a paridade.
 */
const PAYLOADS: Record<string, unknown>[] = [
	{ agencyId: "a", role: "owner" },
	{ agencyId: "a", role: "owner", actorPrincipalId: "p" },
	{ z: 1, a: 2, m: 3 },
	{ nested: { b: 1, a: 2 }, list: [1, "two", null] },
	{ list: [{ x: 1 }, { y: null }] },
	{ flag: true, off: false, zero: 0, empty: "" },
	{ optional: undefined, present: "x" },
	{ nil: null },
	{ unicode: "ação-ç-日本", emoji: "🔐" },
];

describe("hashCommandPayload — paridade organizations x governance", () => {
	for (const [index, payload] of PAYLOADS.entries()) {
		test(`payload #${index} produz o mesmo hash nos dois modulos`, () => {
			expect(hashOrganizations(payload)).toBe(hashGovernance(payload));
		});
	}

	test("hash e' estavel entre chamadas (deterministico)", () => {
		const payload = { agencyId: "a", role: "owner" };
		expect(hashOrganizations(payload)).toBe(hashOrganizations(payload));
		expect(hashOrganizations(payload)).toHaveLength(64);
	});
});

describe("hashCommandPayload — propriedades que o binding de intencao exige", () => {
	test("ordem de insercao das chaves nao muda o hash", () => {
		expect(hashOrganizations({ a: 1, b: 2, c: 3 })).toBe(
			hashOrganizations({ c: 3, b: 2, a: 1 }),
		);
	});

	test("`undefined` em objeto e' OMITIDO (ausente ≡ undefined)", () => {
		// Intencional: um campo opcional nao informado e um campo informado como
		// `undefined` sao a mesma intencao.
		expect(hashOrganizations({ a: 1, b: undefined })).toBe(
			hashOrganizations({ a: 1 }),
		);
	});

	test("`null` e' DISTINTO de ausente (nao colapsa com omissao)", () => {
		expect(hashOrganizations({ a: null })).not.toBe(
			hashOrganizations({ a: 1 }),
		);
		expect(hashOrganizations({ a: null })).not.toBe(hashOrganizations({}));
	});

	test("payloads reais de comando produzem hashes distintos", () => {
		const base = {
			agencyId: "11111111-1111-4111-8111-111111111111",
			marketScope: "both",
			actorPrincipalId: "22222222-2222-4222-8222-222222222222",
		};
		const variants = [
			base,
			{ ...base, marketScope: "crypto" },
			{ ...base, marketScope: "stocks" },
			{ ...base, actorPrincipalId: "33333333-3333-4333-8333-333333333333" },
			{ ...base, agencyId: "44444444-4444-4444-8444-444444444444" },
		];
		const hashes = variants.map(hashOrganizations);
		expect(new Set(hashes).size).toBe(variants.length);
	});

	test("CARACTERIZACAO — `[undefined]` colide com `[null]` (inalcancavel hoje)", () => {
		// Achado LOW do G4/G5. Hoje NAO e' exploravel: os 8 call-sites hasheiam
		// objetos planos de escalares ja' validados por Zod, entao nenhum payload
		// contem array nem `undefined` dentro de array. Este teste existe para que
		// a colisao seja explicita e para falhar alto se um payload hasheado ganhar
		// campo aninhado/lista sem que a funcao seja endurecida antes.
		expect(hashOrganizations({ a: [undefined] })).toBe(
			hashOrganizations({ a: [null] }),
		);
	});
});
