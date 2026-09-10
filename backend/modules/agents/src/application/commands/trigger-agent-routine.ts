import { randomUUID } from "node:crypto";
import {
	triggerAgentRoutineCommandSchema,
	triggerAgentRoutineResultSchema,
	type TriggerAgentRoutineCommand,
	type TriggerAgentRoutineResult,
} from "@anxionos/contracts/agents";
import { createAgentRoutineTriggeredEvent } from "../../domain/events/agent-events";
import type { AgentBudgetRepository } from "../../domain/ports/agent-budget-repository";
import type { AgentRoutineRepository } from "../../domain/ports/agent-routine-repository";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { RoutineRunDispatchPort } from "../../domain/ports/routine-run-dispatch";
import type { AgentsUnitOfWork } from "../../domain/ports/agents-unit-of-work";
import { loadIdempotentCommandResult, toCommandResultSnapshot } from "../command-support";
import { parseCommandResultSnapshot, throwAgentsError } from "../errors";
import { buildOrganizationTenantContext } from "../services/tenant-context";

function budgetAllows(policy: { caps: { wakeupUnitCap: number; tokenUnitCap: number; timeSecondsCap: number }; wakeupUnitsConsumed: number; tokenUnitsConsumed: number; timeSecondsConsumed: number; status: string }) {
	if (policy.status !== "active") return false;
	return (
		policy.wakeupUnitsConsumed < policy.caps.wakeupUnitCap &&
		policy.tokenUnitsConsumed < policy.caps.tokenUnitCap &&
		policy.timeSecondsConsumed < policy.caps.timeSecondsCap
	);
}

export async function triggerAgentRoutine(deps: TriggerAgentRoutineDeps, input: TriggerAgentRoutineInput): Promise<TriggerAgentRoutineResult> {
	const command = triggerAgentRoutineCommandSchema.parse(input);
	const pre = await deps.agentRoutineRepository.findById(command.routineId);
	if (!pre) throwAgentsError("AGT_ROUTINE_NOT_FOUND", `Routine not found: ${command.routineId}`);
	const replayRaw = await deps.commandJournal.findByCommandId(pre.organizationId, command.commandId);
	if (replayRaw?.responseSnapshot) {
		const parsed = triggerAgentRoutineResultSchema.safeParse(replayRaw.responseSnapshot);
		if (parsed.success) return { ...parsed.data, idempotentReplay: true };
	}
	return deps.unitOfWork.runInTransaction(buildOrganizationTenantContext(pre.organizationId), async (context) => {
		const raced = await context.commandJournal.findByCommandId(pre.organizationId, command.commandId);
		if (raced?.responseSnapshot) {
			const parsed = triggerAgentRoutineResultSchema.safeParse(raced.responseSnapshot);
			if (parsed.success) return { ...parsed.data, idempotentReplay: true };
		}
		const routine = await context.agentRoutineRepository.findById(command.routineId);
		if (!routine) throwAgentsError("AGT_ROUTINE_NOT_FOUND", `Routine not found: ${command.routineId}`);
		if (routine.revision !== command.expectedRevision) throwAgentsError("AGT_REVISION_CONFLICT", `Expected routine revision ${command.expectedRevision}, found ${routine.revision}`);
		if (routine.status === "paused") throwAgentsError("AGT_ROUTINE_PAUSED", `Routine is paused: ${command.routineId}`);
		if (routine.lastDedupeKey === command.dedupeKey && routine.lastRunId) {
			const result = triggerAgentRoutineResultSchema.parse({ routineId: routine.id, revision: routine.revision, dedupeKey: command.dedupeKey, runId: routine.lastRunId, idempotentReplay: true });
			await context.commandJournal.record({ tenantId: pre.organizationId, commandId: command.commandId, commandName: "TriggerAgentRoutine", aggregateId: routine.id, aggregateType: "AgentRoutine", revision: routine.revision, responseSnapshot: result });
			return result;
		}
		const budget = await context.agentBudgetRepository.findByAgentId(routine.agentId);
		if (!budget || !budgetAllows(budget)) throwAgentsError("AGT_BUDGET_EXHAUSTED", `Agent budget exhausted for agent: ${routine.agentId}`);
		const runId = deps.runDispatch
			? (await deps.runDispatch.dispatchRun({ organizationId: routine.organizationId, agentId: routine.agentId, routineId: routine.id, dedupeKey: command.dedupeKey })).runId
			: randomUUID();
		const now = new Date();
		const revision = routine.revision + 1;
		const updated = await context.agentRoutineRepository.save({ ...routine, lastDedupeKey: command.dedupeKey, lastRunId: runId, lastTriggeredAt: now, revision, updatedAt: now });
		const result = triggerAgentRoutineResultSchema.parse({ routineId: updated.id, revision, dedupeKey: command.dedupeKey, runId });
		await context.commandJournal.record({ tenantId: pre.organizationId, commandId: command.commandId, commandName: "TriggerAgentRoutine", aggregateId: updated.id, aggregateType: "AgentRoutine", revision, responseSnapshot: result });
		await context.publishEvents([createAgentRoutineTriggeredEvent({ routineId: updated.id, agentId: updated.agentId, organizationId: updated.organizationId, dedupeKey: command.dedupeKey, runId, revision, idempotentReplay: false })]);
		return result;
	});
}

export interface TriggerAgentRoutineInput extends TriggerAgentRoutineCommand { actorPrincipalId?: string; }
export interface TriggerAgentRoutineDeps {
	unitOfWork: AgentsUnitOfWork;
	commandJournal: CommandJournalRepository;
	agentRoutineRepository: AgentRoutineRepository;
	agentBudgetRepository: AgentBudgetRepository;
	runDispatch?: RoutineRunDispatchPort;
}
