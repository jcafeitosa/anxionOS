import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { BILLING_EVENT_TYPES } from "@anxionos/contracts/billing";
import { BillingCommandError } from "../errors";
import {
	createBillingTestUow,
	TEST_ORG,
	testSubscriptionId,
} from "./billing-test-support";
import { cancelSubscription } from "./cancel-subscription";

const SUBSCRIPTION_ID = testSubscriptionId();

describe("cancelSubscription", () => {
	test("cancels active subscription and publishes event", async () => {
		const { unitOfWork, commandJournal, getSubscriptions, getPublished } =
			createBillingTestUow({
				subscriptions: [
					{
						id: SUBSCRIPTION_ID,
						organizationId: TEST_ORG,
						planCode: "trader",
						billingPeriodStart: "2026-09-01T00:00:00.000Z",
						billingPeriodEnd: "2026-10-01T00:00:00.000Z",
						status: "ACTIVE",
					},
				],
			});

		const result = await cancelSubscription(
			{ unitOfWork, commandJournal },
			{
				commandId: randomUUID(),
				organizationId: TEST_ORG,
				subscriptionId: SUBSCRIPTION_ID,
				cancelledAt: "2026-09-10T12:00:00.000Z",
			},
		);

		expect(result.subscriptionId).toBe(SUBSCRIPTION_ID);
		expect(getSubscriptions().get(SUBSCRIPTION_ID)?.status).toBe("CANCELLED");
		expect(getPublished()[0]?.eventType).toBe(
			BILLING_EVENT_TYPES.SUBSCRIPTION_CANCELLED,
		);
	});

	test("duplicate commandId returns idempotent replay", async () => {
		const commandId = randomUUID();
		const { unitOfWork, commandJournal } = createBillingTestUow({
			subscriptions: [
				{
					id: SUBSCRIPTION_ID,
					organizationId: TEST_ORG,
					planCode: "trader",
					billingPeriodStart: "2026-09-01T00:00:00.000Z",
					billingPeriodEnd: "2026-10-01T00:00:00.000Z",
					status: "ACTIVE",
				},
			],
		});
		const input = {
			commandId,
			organizationId: TEST_ORG,
			subscriptionId: SUBSCRIPTION_ID,
			cancelledAt: "2026-09-10T12:00:00.000Z",
		};
		await cancelSubscription({ unitOfWork, commandJournal }, input);
		const replay = await cancelSubscription(
			{ unitOfWork, commandJournal },
			input,
		);
		expect(replay.idempotentReplay).toBe(true);
	});

	test("rejects missing subscription", async () => {
		const { unitOfWork, commandJournal } = createBillingTestUow();
		await expect(
			cancelSubscription(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId: TEST_ORG,
					subscriptionId: SUBSCRIPTION_ID,
					cancelledAt: "2026-09-10T12:00:00.000Z",
				},
			),
		).rejects.toBeInstanceOf(BillingCommandError);
	});
});
