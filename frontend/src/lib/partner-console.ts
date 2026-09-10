import { z } from "zod";
import type { PostLoginAuthContext } from "./auth";

const uuidSchema = z.string().uuid();

export const partnerDtoSchema = z.object({
	id: z.string(),
	organizationId: z.string().uuid(),
	referralCode: z.string(),
	displayName: z.string(),
	commissionRate: z.string(),
	referredOrganizationId: z.string().uuid(),
	status: z.enum(["ACTIVE", "SUSPENDED"]),
	revision: z.number().int(),
});

export const commissionAccrualDtoSchema = z.object({
	id: z.string(),
	partnerId: z.string(),
	partnerOrganizationId: z.string().uuid(),
	referredOrganizationId: z.string().uuid(),
	invoiceId: z.string(),
	invoiceTotalAmount: z.string(),
	commissionRate: z.string(),
	commissionAmount: z.string(),
	status: z.enum(["ACCRUED", "REVERSED", "PAID"]),
	accruedAt: z.string(),
	reversedAt: z.string().nullable(),
});

export const payoutDtoSchema = z.object({
	id: z.string(),
	partnerId: z.string(),
	partnerOrganizationId: z.string().uuid(),
	requestedAmount: z.string(),
	status: z.enum(["REQUESTED", "APPROVED", "REJECTED"]),
	requestedAt: z.string(),
	approvedAt: z.string().nullable(),
	approvalReference: z.string().nullable(),
});

export const partnerResponseSchema = z.object({
	partner: partnerDtoSchema,
});

export const commissionAccrualsResponseSchema = z.object({
	accruals: z.array(commissionAccrualDtoSchema),
});

export const payoutsResponseSchema = z.object({
	payouts: z.array(payoutDtoSchema),
});

export type PartnerDto = z.infer<typeof partnerDtoSchema>;
export type CommissionAccrualDto = z.infer<typeof commissionAccrualDtoSchema>;
export type PayoutDto = z.infer<typeof payoutDtoSchema>;

export interface PartnerConsoleModel {
	organizationId: string;
	partner: PartnerDto;
	accrualCount: number;
	payoutCount: number;
	accrualsTotalAmount: string;
	payoutsRequestedTotal: string;
	hasOperationalData: boolean;
}

export class PartnerConsoleFetchError extends Error {
	readonly status: number;
	readonly code: string | null;

	constructor(status: number, code: string | null, message: string) {
		super(message);
		this.name = "PartnerConsoleFetchError";
		this.status = status;
		this.code = code;
	}
}

export class PartnerOrganizationUnresolvedError extends Error {
	readonly reason: "no_membership" | "ambiguous_membership";

	constructor(reason: "no_membership" | "ambiguous_membership") {
		super(
			reason === "ambiguous_membership"
				? "multiple memberships — organizationId cannot be inferred"
				: "no membership to scope partner console",
		);
		this.name = "PartnerOrganizationUnresolvedError";
		this.reason = reason;
	}
}

/**
 * Resolves the partner organization scope from post-login context only.
 * Never reads URL params or localStorage — fail-closed when ambiguous.
 */
export function resolvePartnerOrganizationId(
	context: PostLoginAuthContext,
): string {
	const fromDecision = context.decision.agencyId;
	if (fromDecision && uuidSchema.safeParse(fromDecision).success) {
		return fromDecision;
	}
	const memberships = context.membershipsActive;
	if (memberships.length === 1) {
		return memberships[0]!.agencyId;
	}
	if (memberships.length === 0) {
		throw new PartnerOrganizationUnresolvedError("no_membership");
	}
	throw new PartnerOrganizationUnresolvedError("ambiguous_membership");
}

export function partnerConsoleModel(input: {
	organizationId: string;
	partner: PartnerDto;
	accruals: readonly CommissionAccrualDto[];
	payouts: readonly PayoutDto[];
}): PartnerConsoleModel {
	const accrualsTotalAmount = sumDecimalStrings(
		input.accruals
			.filter((row) => row.status === "ACCRUED")
			.map((row) => row.commissionAmount),
	);
	const payoutsRequestedTotal = sumDecimalStrings(
		input.payouts.map((row) => row.requestedAmount),
	);
	return {
		organizationId: input.organizationId,
		partner: input.partner,
		accrualCount: input.accruals.length,
		payoutCount: input.payouts.length,
		accrualsTotalAmount,
		payoutsRequestedTotal,
		hasOperationalData: input.accruals.length > 0 || input.payouts.length > 0,
	};
}

function sumDecimalStrings(values: readonly string[]): string {
	if (values.length === 0) {
		return "0";
	}
	const total = values.reduce(
		(acc, value) => acc + Number.parseFloat(value),
		0,
	);
	return Number.isFinite(total) ? total.toFixed(2) : "0";
}

export interface PartnerConsolePage<T> {
	items: readonly T[];
	hasMore: boolean;
}

/** Client-side page helper until API exposes cursor/limit (slice 4). */
export function paginatePartnerList<T>(
	items: readonly T[],
	page: number,
	pageSize: number,
): PartnerConsolePage<T> {
	if (pageSize <= 0) {
		throw new Error("pageSize must be positive");
	}
	if (page < 1) {
		throw new Error("page must be >= 1");
	}
	const start = (page - 1) * pageSize;
	const slice = items.slice(start, start + pageSize);
	return {
		items: slice,
		hasMore: start + slice.length < items.length,
	};
}

async function parsePartnersError(response: Response): Promise<PartnerConsoleFetchError> {
	let code: string | null = null;
	try {
		const body = (await response.json()) as {
			error?: { details?: { code?: string } };
		};
		code = body.error?.details?.code ?? null;
	} catch {
		// ignore malformed error body
	}
	return new PartnerConsoleFetchError(
		response.status,
		code,
		code ?? `partners API error (${response.status})`,
	);
}

export type PartnerFetchFn = typeof fetch;

function partnersBasePath(organizationId: string): string {
	return `/v1/partners/organizations/${encodeURIComponent(organizationId)}`;
}

export async function fetchPartnerProfile(
	organizationId: string,
	fetchFn: PartnerFetchFn = fetch,
): Promise<PartnerDto> {
	const response = await fetchFn(partnersBasePath(organizationId), {
		credentials: "include",
		headers: { Accept: "application/json" },
	});
	if (!response.ok) {
		throw await parsePartnersError(response);
	}
	return partnerResponseSchema.parse(await response.json()).partner;
}

export async function fetchCommissionAccruals(
	organizationId: string,
	partnerId?: string,
	fetchFn: PartnerFetchFn = fetch,
): Promise<CommissionAccrualDto[]> {
	const query = partnerId
		? `?partnerId=${encodeURIComponent(partnerId)}`
		: "";
	const response = await fetchFn(
		`${partnersBasePath(organizationId)}/commission-accruals${query}`,
		{
			credentials: "include",
			headers: { Accept: "application/json" },
		},
	);
	if (!response.ok) {
		throw await parsePartnersError(response);
	}
	return commissionAccrualsResponseSchema.parse(await response.json()).accruals;
}

export async function fetchPayouts(
	organizationId: string,
	partnerId?: string,
	fetchFn: PartnerFetchFn = fetch,
): Promise<PayoutDto[]> {
	const query = partnerId
		? `?partnerId=${encodeURIComponent(partnerId)}`
		: "";
	const response = await fetchFn(`${partnersBasePath(organizationId)}/payouts${query}`, {
		credentials: "include",
		headers: { Accept: "application/json" },
	});
	if (!response.ok) {
		throw await parsePartnersError(response);
	}
	return payoutsResponseSchema.parse(await response.json()).payouts;
}

export interface PartnerConsoleSnapshot {
	organizationId: string;
	partner: PartnerDto;
	accruals: CommissionAccrualDto[];
	payouts: PayoutDto[];
	model: PartnerConsoleModel;
}

export async function loadPartnerConsoleSnapshot(
	context: PostLoginAuthContext,
	fetchFn: PartnerFetchFn = fetch,
): Promise<PartnerConsoleSnapshot> {
	const organizationId = resolvePartnerOrganizationId(context);
	const partner = await fetchPartnerProfile(organizationId, fetchFn);
	const [accruals, payouts] = await Promise.all([
		fetchCommissionAccruals(organizationId, partner.id, fetchFn),
		fetchPayouts(organizationId, partner.id, fetchFn),
	]);
	return {
		organizationId,
		partner,
		accruals,
		payouts,
		model: partnerConsoleModel({ organizationId, partner, accruals, payouts }),
	};
}

export function honestStateForPartnerError(
	error: unknown,
): "denied" | "empty" | "stale" {
	if (error instanceof PartnerConsoleFetchError) {
		if (error.status === 404 || error.code === "PTR_PARTNER_NOT_FOUND") {
			return "empty";
		}
		if (error.status === 403) {
			return "denied";
		}
	}
	return "stale";
}
