import type { OrchestrationTransactionContext } from "../domain/ports/orchestration-unit-of-work";
import type { OrganizationScopePort } from "../domain/ports/organization-scope";
import type { TraversalEvaluator } from "../domain/ports/traversal-evaluator";
import { OrchestrationCommandError, throwOrchestrationError } from "./errors";

export interface CheckoutAuthorizationDeps {
    organizationScope: OrganizationScopePort;
    traversalEvaluator: TraversalEvaluator;
}

    issueIdentifier: string;
    agentId: string;
}): Promise<void>;

export async function assertCheckoutAuthorized(context, deps, input) {
    await deps.organizationScope.assertActive(input.organizationId);
    try {
        const evaluation = await deps.traversalEvaluator.evaluateT01({
            principalId: input.agentId,
            organizationId: input.organizationId,
            agentId: input.agentId,
            actingScope: input.organizationId,
        });
        if (evaluation.decision !== "ALLOW") {
            throwOrchestrationError("ORC_CHECKOUT_DENIED", `Traversal T01 denied checkout for ${input.issueIdentifier}`);
        }
    }
    catch (error) {
        if (error instanceof OrchestrationCommandError) {
            throw error;
        }
        throwOrchestrationError("ORC_GOVERNANCE_UNAVAILABLE", "Traversal T01 unavailable for checkout", { cause: error });
    }
    const g0Pass = await context.gateBindingRepository.findVigentePass(input.organizationId, input.issueIdentifier, "G0");
    if (g0Pass) {
        return;
    }
    const mirror = await context.taskboardMirrorRepository.findLatestByIssue(input.issueIdentifier);
    if (mirror?.status === "in_progress") {
        return;
    }
    throwOrchestrationError("ORC_CHECKOUT_DENIED", `Checkout denied for ${input.issueIdentifier}: missing G0 PASS or board in_progress`);
}
