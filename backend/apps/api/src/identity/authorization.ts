import { PLATFORM_SCOPE_ID } from "@anxionos/contracts/governance";
import { hasCapability } from "@anxionos/governance";
import { throwIdentityError } from "@anxionos/identity";
import type { IdentityPluginDeps } from "./deps";

/**
 * Declaring an agency you do not belong to is a cross-tenant attempt, not a
 * missing grant. It is checked even for self-access, because the declared scope
 * is part of the request's intent and silencing it weakens the cross-tenant
 * signal.
 */
async function assertAgencyMembership(
	deps: Pick<IdentityPluginDeps, "agencyScope">,
	agencyId: string | undefined,
	principalId: string,
): Promise<void> {
	if (!agencyId) {
		return;
	}
	const isMember = await deps.agencyScope.isMember(agencyId, principalId);
	if (!isMember) {
		throwIdentityError(
			"IDN_CROSS_TENANT",
			"Caller is not a member of the declared agency",
		);
	}
}

/**
 * ANX-457 (achado HIGH proprio) — o escopo declarado limita o ALVO, nao so o
 * ator. Principal e' global (D-IDN-023) e identity nao guarda FK de agencia, o
 * unico sinal de tenancy do alvo sao as memberships em `organizations`. Sem
 * esta checagem, um grant de agencia A autorizava ler (inclusive e-mail/PII) e
 * suspender/revogar principal de QUALQUER agencia — basta declarar a propria.
 */
async function assertTargetInDeclaredAgency(
	deps: Pick<IdentityPluginDeps, "agencyScope">,
	agencyId: string | undefined,
	targetPrincipalId: string,
): Promise<void> {
	if (!agencyId) {
		// Autoridade de plataforma: opera sobre qualquer principal.
		return;
	}
	const agencies =
		await deps.agencyScope.listAgencyIdsForPrincipal(targetPrincipalId);
	if (!agencies.includes(agencyId)) {
		throwIdentityError(
			"IDN_CROSS_TENANT",
			"Target principal does not belong to the declared agency",
		);
	}
	// ANX-465 (HIGH da revalidacao G4): a premissa de que membership e' vinculo
	// confiavel e' falsa — a assisted activation de organizations (D-ORG-036)
	// permite que owner/admin de A anexe a A um principal de OUTRO tenant sem
	// consentimento. Sem esta regra, o escopo do alvo passava a autorizar leitura
	// de e-mail e suspensao global desse principal. Autoridade agency-scoped
	// exige que o alvo NAO tenha vinculo ativo em outra agencia; nesse caso so'
	// autoridade de plataforma (escopo PLATFORM) opera sobre ele.
	if (agencies.some((other) => other !== agencyId)) {
		throwIdentityError(
			"IDN_CROSS_TENANT",
			"Target principal belongs to another agency; platform authority required",
		);
	}
}

async function assertCapability(
	deps: Pick<IdentityPluginDeps, "grantRepository">,
	input: {
		principalId: string;
		capability: "identity.read" | "identity.admin";
		agencyId?: string;
	},
): Promise<void> {
	const allowed = await hasCapability(
		{ grantRepository: deps.grantRepository },
		{
			principalId: input.principalId,
			capability: input.capability,
			// Sem agencia declarada a requisicao e PLATFORM-global e exige o
			// escopo PLATAFORMA (ANX-462). Um grant de agencia nunca autoriza
			// operacao global — era o bypass: omitir o header degradava para
			// "qualquer escopo". Com agencia declarada, o grant precisa cobrir
			// ESSA agencia: um grant emitido para A nao autoriza operar sob B.
			scopeId: input.agencyId ?? PLATFORM_SCOPE_ID,
		},
	);
	if (!allowed) {
		throwIdentityError(
			"IDN_FORBIDDEN",
			`Missing required grant: ${input.capability}`,
		);
	}
}

/**
 * R04 authorization for the identity boundary. Capabilities are checked through
 * `governance` (the grant owner); when the caller declares an agency, the grant
 * must cover **that** agency (least privilege), not any agency.
 */
export async function requireIdentityGrant(
	deps: Pick<IdentityPluginDeps, "grantRepository" | "agencyScope">,
	input: {
		principalId: string;
		capability: "identity.read" | "identity.admin";
		agencyId?: string;
		/** Alvo da operacao, quando existe: o escopo declarado precisa cobri-lo. */
		targetPrincipalId?: string;
		/**
		 * A operacao tem efeito GLOBAL (registrar um principal novo — que nasce
		 * sem vinculo de agencia — ou ler o ledger global de sessoes). Exige grant
		 * no escopo PLATAFORMA mesmo que o chamador declare uma agencia: uma
		 * agencia nao pode criar principal global nem ler ledger de terceiros
		 * (D-IDN-042; achados N1 do G2 e F-G5-2 do G5).
		 */
		requirePlatform?: boolean;
	},
): Promise<void> {
	await assertAgencyMembership(deps, input.agencyId, input.principalId);
	if (input.targetPrincipalId) {
		await assertTargetInDeclaredAgency(
			deps,
			input.agencyId,
			input.targetPrincipalId,
		);
	}
	await assertCapability(deps, {
		principalId: input.principalId,
		capability: input.capability,
		// Declarar agencia continua sendo validado (sinal de cross-tenant), mas
		// nao afrouxa o escopo exigido da operacao global.
		agencyId: input.requirePlatform ? undefined : input.agencyId,
	});
}

/** Self-access is allowed without a grant (ficha: `identity.principal.get (self)`). */
export async function requireSelfOrGrant(
	deps: Pick<IdentityPluginDeps, "grantRepository" | "agencyScope">,
	input: {
		actorPrincipalId: string;
		targetPrincipalId: string;
		capability: "identity.read" | "identity.admin";
		agencyId?: string;
	},
): Promise<void> {
	await assertAgencyMembership(deps, input.agencyId, input.actorPrincipalId);
	if (input.actorPrincipalId === input.targetPrincipalId) {
		return;
	}
	await assertTargetInDeclaredAgency(
		deps,
		input.agencyId,
		input.targetPrincipalId,
	);
	await assertCapability(deps, {
		principalId: input.actorPrincipalId,
		capability: input.capability,
		agencyId: input.agencyId,
	});
}
