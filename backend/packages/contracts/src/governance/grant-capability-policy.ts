import {
	AGENTS_BUDGET_MANAGE_CAPABILITY,
	AGENTS_PUBLISH_CAPABILITY,
	AGENTS_ROUTINE_REGISTER_CAPABILITY,
	AGENTS_ROUTINE_TRIGGER_CAPABILITY,
	AGENTS_SKILL_BIND_CAPABILITY,
	AGENTS_SKILL_EVALUATE_CAPABILITY,
	AGENTS_SKILL_REGISTER_CAPABILITY,
} from "../agents/capabilities";
import { OPENBOT_TOOL_INVOKE_CAPABILITY } from "../openbot/capabilities";
import type { MembershipRole } from "../organizations/types";
import { PLATFORM_CONSOLE_CAPABILITY } from "./types";

/**
 * ANX-466 (G5 FURO 1) — **fonte unica da autoridade de OWNER**.
 *
 * `hasOwnerAuthority` (`modules/governance/src/domain/policies/owner-approval-policy.ts`)
 * confere aprovacao de ChangeProposal INSTITUTIONAL/HIERARCHY_MODE a quem tem
 * **qualquer um** destes grants. Enquanto a lista viver em dois lugares, um
 * token aparentemente "de leitura" escapa da classe administrativa e volta a
 * ser moeda de escalacao: o G5 mediu um `operator` emitindo `owner.read` a
 * terceiro e o terceiro passando a aprovar proposta institucional.
 *
 * A baseline emitida no `membership.activated` e a classificacao administrativa
 * derivam desta lista — nao ha segunda copia.
 */
export const OWNER_AUTHORITY_CAPABILITIES = [
	"owner.read",
	"owner.write",
	"owner.manage",
] as const;

/**
 * ANX-466 — catalogo declarado das capabilities que podem virar GRANT.
 *
 * `governance_grants.capability` era `z.string().min(1)`: qualquer string
 * entrava no estado de autorizacao. A correcao do ANX-462 fechou apenas a
 * variante platform-only (`console.platform`) aplicando coerencia de escopo;
 * o resto da injecao continuava aberto (um `operator` autoconcedia
 * `identity.admin` e revogava o owner da agencia).
 *
 * Este catalogo e' a fonte unica dos tokens de grant que o sistema consome de
 * fato. Cada entrada aponta o dono do token; capability fora daqui e' recusada
 * com `GOV_CAPABILITY_UNKNOWN` (400), inclusive quando emitida por comando
 * direto (seed/worker), nao so' pela rota HTTP.
 *
 * Nao entram aqui os `capabilityId` do CapabilityManifest: aqueles nomeiam
 * OPERACOES (`identity.principal.register`), e o manifesto declara quais
 * grants cada operacao exige em `requiredGrants`. O grant em si e' o token
 * desta lista.
 */
export const GRANT_CAPABILITY_CATALOG = [
	...OWNER_AUTHORITY_CAPABILITIES,
	// identity R04 / D-IDN-034: autoridade sobre principals (D-IDN-044 exige
	// escopo de plataforma para as operacoes de efeito global).
	"identity.read",
	"identity.admin",
	// contracts/agents/capabilities.ts — autoridade operacional de agentes.
	AGENTS_PUBLISH_CAPABILITY,
	AGENTS_SKILL_REGISTER_CAPABILITY,
	AGENTS_SKILL_BIND_CAPABILITY,
	AGENTS_SKILL_EVALUATE_CAPABILITY,
	AGENTS_ROUTINE_REGISTER_CAPABILITY,
	AGENTS_ROUTINE_TRIGGER_CAPABILITY,
	AGENTS_BUDGET_MANAGE_CAPABILITY,
	// contracts/openbot/capabilities.ts — invocacao governada de ferramenta.
	OPENBOT_TOOL_INVOKE_CAPABILITY,
	// ANX-462: autoridade de PLATAFORMA (exige escopo plataforma).
	PLATFORM_CONSOLE_CAPABILITY,
] as const;

export type GrantCapability = (typeof GRANT_CAPABILITY_CATALOG)[number];

const KNOWN_GRANT_CAPABILITIES = new Set<string>(GRANT_CAPABILITY_CATALOG);

export function isKnownGrantCapability(capability: string): boolean {
	return KNOWN_GRANT_CAPABILITIES.has(capability);
}

/**
 * Capabilities administrativas: concedem autoridade sobre a instituicao (nao
 * sobre um recurso operacional). Um `operator` nunca as emite e um emissor so'
 * as repassa se ja' as detiver — e' o que impede transformar `identity.admin`
 * ou `owner.*` em moeda de escalacao lateral.
 *
 * A autoridade de owner vem de `OWNER_AUTHORITY_CAPABILITIES` (fonte unica,
 * compartilhada com `hasOwnerAuthority`); os demais por prefixo explicito, nao
 * inferido do formato da string.
 */
export const ADMINISTRATIVE_CAPABILITY_PREFIXES: readonly string[] = [
	"identity.",
	"governance.",
	"console.",
];

const ADMINISTRATIVE_OWNER_CAPABILITIES = new Set<string>(
	OWNER_AUTHORITY_CAPABILITIES,
);

export function isAdministrativeGrantCapability(capability: string): boolean {
	if (ADMINISTRATIVE_OWNER_CAPABILITIES.has(capability)) {
		return true;
	}
	return ADMINISTRATIVE_CAPABILITY_PREFIXES.some((prefix) =>
		capability.startsWith(prefix),
	);
}

/** Roles de membership autorizados a emitir grant na agencia. */
export const GRANT_ISSUANCE_ROLES: readonly MembershipRole[] = [
	"owner",
	"admin",
	"operator",
];

/**
 * Matriz declarada papel x classe de capability. `operator` so' emite
 * capability operacional; owner/admin emitem operacional e administrativa.
 *
 * A matriz e' necessaria mas **nao suficiente**: o boundary exige ainda que o
 * emissor detenha a capability (escopo da agencia ou PLATAFORMA) antes de
 * concede-la a qualquer alvo — inclusive capability operacional, porque
 * `agents.*` tambem e' autoridade efetiva (`hasCapability`/autonomy fallback).
 */
export function roleMayIssueGrantCapability(
	role: MembershipRole,
	capability: string,
): boolean {
	if (!GRANT_ISSUANCE_ROLES.includes(role)) {
		return false;
	}
	if (role === "operator") {
		return !isAdministrativeGrantCapability(capability);
	}
	return true;
}
