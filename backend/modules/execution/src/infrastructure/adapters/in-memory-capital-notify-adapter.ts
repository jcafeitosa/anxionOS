import type {
	ExecutionCapitalNotifyPort,
	FillConfirmedCapitalNotification,
	OrderCancelledCapitalNotification,
} from "../../domain/ports/execution-capital-notify-port";

export class InMemoryExecutionCapitalNotifyAdapter
	implements ExecutionCapitalNotifyPort
{
	readonly fillNotifications: FillConfirmedCapitalNotification[] = [];
	readonly cancelNotifications: OrderCancelledCapitalNotification[] = [];

	onFillConfirmed(notification: FillConfirmedCapitalNotification): void {
		this.fillNotifications.push({ ...notification });
	}

	onOrderCancelled(notification: OrderCancelledCapitalNotification): void {
		this.cancelNotifications.push({ ...notification });
	}

	clear(): void {
		this.fillNotifications.length = 0;
		this.cancelNotifications.length = 0;
	}
}
