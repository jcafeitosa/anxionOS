/** Read-only hook for capital module — event/port notification only, no lateral writes. */
export interface FillConfirmedCapitalNotification {
	organizationId: string;
	fillId: string;
	orderId: string;
	notionalAmount: string;
	asset: string;
	capitalAccountId?: string;
	portfolioId?: string;
}

export interface OrderCancelledCapitalNotification {
	organizationId: string;
	orderId: string;
	remainingQuantity: string;
	capitalAccountId?: string;
	portfolioId?: string;
	reservationId?: string;
}

export interface ExecutionCapitalNotifyPort {
	onFillConfirmed(notification: FillConfirmedCapitalNotification): void;
	onOrderCancelled(notification: OrderCancelledCapitalNotification): void;
}

export const noopExecutionCapitalNotifyPort: ExecutionCapitalNotifyPort = {
	onFillConfirmed() {},
	onOrderCancelled() {},
};
