import type { z } from "zod";
import { invoiceRefundedPayloadSchema } from "../billing/events";

export const billingRefundProcessedBridgeSchema = invoiceRefundedPayloadSchema;

export type BillingRefundProcessedBridge = z.infer<
	typeof billingRefundProcessedBridgeSchema
>;
