import { assertCapabilityOutcomeKnown } from "./errors";
import {
	assertCapabilityChannelAllowed,
	assertCapabilityExecutionModeAllowed,
	getCapabilityManifestEntry,
	getCapabilitySurfaceMatrix,
	listCapabilityManifestEntries,
	parseCapabilityError,
	parseCapabilityOutput,
	validateCapabilityInput,
} from "./registry";
import type {
	CapabilityId,
	CapabilityInvocationChannel,
	CapabilityManifestEntry,
	ExecutionMode,
} from "./schema";

export interface CapabilityInvocationContext {
	channel: CapabilityInvocationChannel;
	executionMode: ExecutionMode;
}

export interface CapabilityManifestClient {
	list(): CapabilityManifestEntry[];
	get(capabilityId: CapabilityId): CapabilityManifestEntry;
	surfaces(capabilityId: CapabilityId): CapabilityManifestEntry["surfaces"];
	validateInput(capabilityId: CapabilityId, input: unknown): unknown;
	parseOutput(capabilityId: CapabilityId, output: unknown): unknown;
	parseError(capabilityId: CapabilityId, errorBody: unknown): unknown;
	assertInvocationAllowed(
		capabilityId: CapabilityId,
		context: CapabilityInvocationContext,
	): CapabilityManifestEntry;
	assertOutcomeKnown(state: string, capabilityId?: CapabilityId): void;
}

export function createCapabilityManifestClient(): CapabilityManifestClient {
	return {
		list: listCapabilityManifestEntries,
		get: getCapabilityManifestEntry,
		surfaces: getCapabilitySurfaceMatrix,
		validateInput: validateCapabilityInput,
		parseOutput: parseCapabilityOutput,
		parseError: parseCapabilityError,
		assertInvocationAllowed(capabilityId, context) {
			const entry = getCapabilityManifestEntry(capabilityId);
			assertCapabilityChannelAllowed(entry, context.channel);
			assertCapabilityExecutionModeAllowed(entry, context.executionMode);
			return entry;
		},
		assertOutcomeKnown(state, capabilityId) {
			assertCapabilityOutcomeKnown(
				state,
				capabilityId ? { capabilityId } : undefined,
			);
		},
	};
}
