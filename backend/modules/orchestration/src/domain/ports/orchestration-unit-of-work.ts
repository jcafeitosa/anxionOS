import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type {} from "@anxionos/contracts/orchestration";
import type { CommandJournalRepository } from "./command-journal";
import type { GateBindingRepository } from "./gate-binding-repository";
import type { GoalRepository } from "./goal-repository";
import type { RunHeartbeatRepository } from "./run-heartbeat-repository";
import type { RunRepository } from "./run-repository";
import type { TaskLeaseRepository } from "./task-lease-repository";
import type { TaskRepository } from "./task-repository";
import type { TaskboardMirrorRepository } from "./taskboard-mirror-repository";
export interface OrchestrationTransactionContext {
	client: unknown;
	goalRepository: GoalRepository;
	taskRepository: TaskRepository;
	runRepository: RunRepository;
	taskLeaseRepository: TaskLeaseRepository;
	gateBindingRepository: GateBindingRepository;
	commandJournal: CommandJournalRepository;
	runHeartbeatRepository: RunHeartbeatRepository;
	taskboardMirrorRepository: TaskboardMirrorRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}
export interface OrchestrationCommandOutcome<
	TResponse = Record<string, unknown>,
> {
	response: TResponse;
	events: DomainEventEnvelope[];
}
export interface OrchestrationUnitOfWork {
	runInTransaction<T>(
		work: (context: OrchestrationTransactionContext) => Promise<T>,
	): Promise<T>;
}
