import { describe, expect, test } from "bun:test";
import {
	agencyCreatedPayloadSchema,
	agencyDtoSchema,
	createAgencyCommandSchema,
	inviteMemberCommandSchema,
	membershipDtoSchema,
	ORGANIZATION_EVENT_TYPES,
	ownershipTransferredPayloadSchema,
	transferOwnershipCommandSchema,
} from "@anxionos/contracts/organizations";

const VALID_UUID = "a1234567-89ab-4def-8123-456789abcdef";
const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const V6_UUID = "6ba7b810-9dad-61d1-80b4-00c04fd430c8";
const INVALID_VARIANT = "ffffffff-ffff-ffff-ffff-ffffffffffff";
const ISO_NOW = "2026-09-11T12:00:00.000Z";

describe("Organizations institutional UUID boundaries (ANX-444)", () => {
	test("createAgencyCommandSchema rejects nil commandId", () => {
		expect(
			createAgencyCommandSchema.safeParse({
				commandId: NIL_UUID,
				displayName: "Test Agency",
				marketScope: "stocks",
			}).success,
		).toBe(false);
	});

	test("inviteMemberCommandSchema rejects v6+ agencyId", () => {
		expect(
			inviteMemberCommandSchema.safeParse({
				commandId: VALID_UUID,
				agencyId: V6_UUID,
				email: "member@example.com",
				role: "viewer",
			}).success,
		).toBe(false);
	});

	test("transferOwnershipCommandSchema rejects non-RFC variant principalId", () => {
		expect(
			transferOwnershipCommandSchema.safeParse({
				commandId: VALID_UUID,
				agencyId: VALID_UUID,
				newOwnerPrincipalId: INVALID_VARIANT,
			}).success,
		).toBe(false);
	});

	test("agencyCreatedPayloadSchema rejects nil ownerPrincipalId", () => {
		expect(
			agencyCreatedPayloadSchema.safeParse({
				agencyId: VALID_UUID,
				ownerPrincipalId: NIL_UUID,
				displayName: "Test Agency",
				marketScope: "both",
				status: "draft",
				onboardingStep: "created",
				revision: 1,
			}).success,
		).toBe(false);
	});

	test("ownershipTransferredPayloadSchema rejects nil membership ids", () => {
		expect(
			ownershipTransferredPayloadSchema.safeParse({
				agencyId: VALID_UUID,
				previousOwnerPrincipalId: VALID_UUID,
				previousOwnerMembershipId: NIL_UUID,
				newOwnerPrincipalId: VALID_UUID,
				newOwnerMembershipId: VALID_UUID,
				revision: 2,
			}).success,
		).toBe(false);
	});

	test("agencyDtoSchema accepts valid institutional UUIDs", () => {
		expect(
			agencyDtoSchema.safeParse({
				id: VALID_UUID,
				ownerPrincipalId: VALID_UUID,
				displayName: "Test Agency",
				marketScope: "crypto",
				status: "ready",
				onboardingStep: "ready",
				revision: 1,
				createdAt: ISO_NOW,
				updatedAt: ISO_NOW,
			}).success,
		).toBe(true);
	});

	test("membershipDtoSchema rejects nil principalId when present", () => {
		expect(
			membershipDtoSchema.safeParse({
				id: VALID_UUID,
				agencyId: VALID_UUID,
				principalId: NIL_UUID,
				role: "operator",
				status: "active",
				revision: 1,
			}).success,
		).toBe(false);
	});

	test("membershipDtoSchema accepts null principalId for invited members", () => {
		expect(
			membershipDtoSchema.safeParse({
				id: VALID_UUID,
				agencyId: VALID_UUID,
				principalId: null,
				role: "viewer",
				status: "invited",
				revision: 0,
			}).success,
		).toBe(true);
	});

	test("organization event payload rejects invalid agencyId in agency.created", () => {
		expect(
			agencyCreatedPayloadSchema.safeParse({
				agencyId: V6_UUID,
				ownerPrincipalId: VALID_UUID,
				displayName: "Test Agency",
				marketScope: "stocks",
				status: "draft",
				onboardingStep: "created",
				revision: 0,
			}).success,
		).toBe(false);
		expect(ORGANIZATION_EVENT_TYPES.AGENCY_CREATED).toBe(
			"organizations.agency.created.v1",
		);
	});
});
