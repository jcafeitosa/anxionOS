import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	STRATEGIES_EVENT_TYPES,
	STRATEGIES_OWNER_DOMAIN,
} from "@anxionos/contracts/strategies";

export function createStrategyRegisteredEvent(input: {
	strategyId: string;
	organizationId: string;
	revision: number;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: STRATEGIES_EVENT_TYPES.STRATEGY_REGISTERED,
		schemaVersion: "0.1.0",
		ownerDomain: STRATEGIES_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createStrategyVersionPublishedEvent(input: {
	strategyId: string;
	strategyVersionId: string;
	organizationId: string;
	versionNumber: number;
	sourceHash: string;
	rulesHash: string;
	parametersHash: string;
	executionMode: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: STRATEGIES_EVENT_TYPES.VERSION_PUBLISHED,
		schemaVersion: "0.1.0",
		ownerDomain: STRATEGIES_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}


export function createBacktestRequestedEvent(input: {
	backtestRequestId: string;
	organizationId: string;
	strategyId: string;
	strategyVersionId: string;
	datasetId: string;
	datasetRevision: string;
	seed: string;
	executionMode: string;
	requestedAt: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: STRATEGIES_EVENT_TYPES.BACKTEST_REQUESTED,
		schemaVersion: "0.1.0",
		ownerDomain: STRATEGIES_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createBacktestCompletedEvent(input: {
	backtestRequestId: string;
	organizationId: string;
	strategyId: string;
	strategyVersionId: string;
	resultRef: string | null;
	metricsHash: string | null;
	status: "COMPLETED" | "FAILED";
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: STRATEGIES_EVENT_TYPES.BACKTEST_COMPLETED,
		schemaVersion: "0.1.0",
		ownerDomain: STRATEGIES_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createDeploymentActivatedEvent(input: {
	deploymentId: string;
	organizationId: string;
	strategyId: string;
	strategyVersionId: string;
	executionMode: string;
	portfolioId: string | null;
	bindingHash: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: STRATEGIES_EVENT_TYPES.DEPLOYMENT_ACTIVATED,
		schemaVersion: "0.1.0",
		ownerDomain: STRATEGIES_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createSignalEmittedEvent(input: {
	signalId: string;
	organizationId: string;
	strategyId: string;
	deploymentId: string | null;
	instrumentRefs: string[];
	valueRef: string;
	expiresAt: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: STRATEGIES_EVENT_TYPES.SIGNAL_EMITTED,
		schemaVersion: "0.1.0",
		ownerDomain: STRATEGIES_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createVersionCertifiedEvent(input: {
	strategyId: string;
	strategyVersionId: string;
	organizationId: string;
	certificationId: string;
	revision: number;
	issuedAt: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: STRATEGIES_EVENT_TYPES.VERSION_CERTIFIED,
		schemaVersion: "0.1.0",
		ownerDomain: STRATEGIES_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createDeploymentRolledBackEvent(input: {
	deploymentId: string;
	organizationId: string;
	strategyId: string;
	strategyVersionId: string;
	reason: string;
	rolledBackBy: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: STRATEGIES_EVENT_TYPES.DEPLOYMENT_ROLLED_BACK,
		schemaVersion: "0.1.0",
		ownerDomain: STRATEGIES_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}
