import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PostLoginAuthContext } from "./auth.ts";
import {
	honestStateForPartnerError,
	paginatePartnerList,
	partnerConsoleModel,
	PartnerConsoleFetchError,
	PartnerOrganizationUnresolvedError,
	resolvePartnerOrganizationId,
} from "./partner-console.ts";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";

function context(
	overrides: Partial<PostLoginAuthContext> = {},
): PostLoginAuthContext {
	return {
		authenticated: true,
		emailVerified: true,
		mfaRequired: false,
		principal: {
			id: "p1",
			authUserId: "u1",
			email: "partner@anxionos.local",
			displayName: "Partner",
		},
		membershipsActive: [{ agencyId: ORG_A, role: "owner", status: "active" }],
		membershipsPending: [],
		platformAccess: false,
		partnerAccess: true,
		onboardingState: { needsProfile: false, needsOrganization: false },
		decision: { kind: "partner", reason: "PARTNER_ACCESS" },
		...overrides,
	};
}

const samplePartner = {
	id: "ptr_prt_00000000-0000-4000-8000-000000000001",
	organizationId: ORG_A,
	referralCode: "REF-DEV",
	displayName: "Acme Partner",
	commissionRate: "10",
	referredOrganizationId: ORG_B,
	status: "ACTIVE" as const,
	revision: 1,
};

describe("resolvePartnerOrganizationId", () => {
	it("prefers decision.agencyId when present", () => {
		assert.equal(
			resolvePartnerOrganizationId(
				context({
					decision: { kind: "partner", agencyId: ORG_B, reason: "PARTNER_ACCESS" },
				}),
			),
			ORG_B,
		);
	});

	it("uses sole active membership when decision has no agencyId", () => {
		assert.equal(resolvePartnerOrganizationId(context()), ORG_A);
	});

	it("throws when memberships are ambiguous", () => {
		assert.throws(
			() =>
				resolvePartnerOrganizationId(
					context({
						membershipsActive: [
							{ agencyId: ORG_A, role: "owner", status: "active" },
							{ agencyId: ORG_B, role: "operator", status: "active" },
						],
					}),
				),
			PartnerOrganizationUnresolvedError,
		);
	});

	it("throws when no membership exists", () => {
		assert.throws(
			() =>
				resolvePartnerOrganizationId(
					context({ membershipsActive: [] }),
				),
			PartnerOrganizationUnresolvedError,
		);
	});
});

describe("partnerConsoleModel", () => {
	it("aggregates accrual and payout counts without inventing ledger totals", () => {
		const model = partnerConsoleModel({
			organizationId: ORG_A,
			partner: samplePartner,
			accruals: [
				{
					id: "ptr_acc_00000000-0000-4000-8000-000000000002",
					partnerId: samplePartner.id,
					partnerOrganizationId: ORG_A,
					referredOrganizationId: ORG_B,
					invoiceId: "bil_inv_1",
					invoiceTotalAmount: "100.00",
					commissionRate: "10",
					commissionAmount: "10.00",
					status: "ACCRUED",
					accruedAt: "2026-09-10T12:00:00.000Z",
					reversedAt: null,
				},
				{
					id: "ptr_acc_00000000-0000-4000-8000-000000000003",
					partnerId: samplePartner.id,
					partnerOrganizationId: ORG_A,
					referredOrganizationId: ORG_B,
					invoiceId: "bil_inv_2",
					invoiceTotalAmount: "50.00",
					commissionRate: "10",
					commissionAmount: "5.00",
					status: "REVERSED",
					accruedAt: "2026-09-10T13:00:00.000Z",
					reversedAt: "2026-09-10T14:00:00.000Z",
				},
			],
			payouts: [
				{
					id: "ptr_pay_00000000-0000-4000-8000-000000000004",
					partnerId: samplePartner.id,
					partnerOrganizationId: ORG_A,
					requestedAmount: "10.00",
					status: "REQUESTED",
					requestedAt: "2026-09-10T15:00:00.000Z",
					approvedAt: null,
					approvalReference: null,
				},
			],
		});
		assert.equal(model.accrualCount, 2);
		assert.equal(model.payoutCount, 1);
		assert.equal(model.accrualsTotalAmount, "10.00");
		assert.equal(model.payoutsRequestedTotal, "10.00");
		assert.equal(model.hasOperationalData, true);
	});
});

describe("paginatePartnerList", () => {
	it("pages in-memory lists until API cursor exists", () => {
		const items = ["a", "b", "c", "d", "a2", "b2"];
		const page1 = paginatePartnerList(items, 1, 2);
		assert.deepEqual(page1.items, ["a", "b"]);
		assert.equal(page1.hasMore, true);
		const page2 = paginatePartnerList(items, 2, 2);
		assert.deepEqual(page2.items, ["c", "d"]);
		assert.equal(page2.hasMore, true);
		const page3 = paginatePartnerList(items, 3, 2);
		assert.deepEqual(page3.items, ["a2", "b2"]);
		assert.equal(page3.hasMore, false);
	});

	it("rejects invalid page inputs", () => {
		assert.throws(() => paginatePartnerList([], 0, 5));
		assert.throws(() => paginatePartnerList([], 1, 0));
	});
});

describe("honestStateForPartnerError", () => {
	it("maps 404 partner not found to empty", () => {
		assert.equal(
			honestStateForPartnerError(
				new PartnerConsoleFetchError(404, "PTR_PARTNER_NOT_FOUND", "missing"),
			),
			"empty",
		);
	});

	it("maps cross-tenant 403 to denied", () => {
		assert.equal(
			honestStateForPartnerError(
				new PartnerConsoleFetchError(403, "PTR_CROSS_TENANT", "forbidden"),
			),
			"denied",
		);
	});

	it("maps unknown failures to stale", () => {
		assert.equal(
			honestStateForPartnerError(
				new PartnerConsoleFetchError(503, null, "unavailable"),
			),
			"stale",
		);
	});
});
