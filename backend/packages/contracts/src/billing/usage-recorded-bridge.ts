import { z } from "zod";
import { usageRecordedPayloadSchema } from "../connections/events";
import {
	billingPeriodSchema,
	billingSubscriptionIdSchema,
	decimalAmountSchema,
} from "./types";
/** Bridge schema for billing consumer input shaped as connections.usage.recorded.v1. */
export const connectionsUsageRecordedBridgeSchema =
	usageRecordedPayloadSchema.extend({
		organizationId: z.string().uuid(),
		subscriptionId: billingSubscriptionIdSchema,
		billingPeriod: billingPeriodSchema,
		unitPrice: decimalAmountSchema,
	});
export function mapUsageRecordedToBillingInput(
	usage: ConnectionsUsageRecordedBridge,
	commandId: string,
): RecordUsageFromConnectionsInput {
	const parsed = connectionsUsageRecordedBridgeSchema.parse(usage);
	return {
		commandId,
		organizationId: parsed.organizationId,
		subscriptionId: parsed.subscriptionId,
		billingPeriod: parsed.billingPeriod,
		unitPrice: parsed.unitPrice,
		usageRecordId: parsed.usageRecordId,
		quantity: parsed.quantity,
		unit: parsed.unit,
		consumerKind: parsed.consumerKind,
		taskId: parsed.taskId,
	};
}

export type ConnectionsUsageRecordedBridge = z.infer<
	typeof connectionsUsageRecordedBridgeSchema
>;
export interface RecordUsageFromConnectionsInput {
	commandId: string;
	organizationId: string;
	subscriptionId: string;
	billingPeriod: string;
	unitPrice: string;
	usageRecordId: string;
	quantity: number;
	unit: string;
	consumerKind: ConnectionsUsageRecordedBridge["consumerKind"];
	taskId?: string;
}
